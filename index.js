const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection setup
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'appointment_ai',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test PostgreSQL connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});

// Initialize database tables
async function initDatabase() {
  try {
    // Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        timezone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create appointments table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        location TEXT,
        participants JSONB,
        status VARCHAR(20) DEFAULT 'upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create calendars table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendars (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        provider VARCHAR(50) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('x-auth-token');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Routes

// Home route
app.get('/', (req, res) => {
  res.send('MeetNing Appointment AI API is running');
});

// Register a new user
app.post('/api/auth/signup', async (req, res) => {
  console.log(req.body);
  try {
    const { name, email, password, timezone } = req.body;
    
    // Check if user already exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const result = await pool.query(
      'INSERT INTO users (name, email, password, timezone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, timezone',
      [name, email, hashedPassword, timezone || 'UTC']
    );
    
    const user = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, timezone FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all appointments for a user
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const status = req.query.status; // Filter by status if provided
    
    let query = 'SELECT * FROM appointments WHERE user_id = $1';
    const queryParams = [req.user.id];
    
    if (status) {
      query += ' AND status = $2';
      queryParams.push(status);
    }
    
    query += ' ORDER BY start_time ASC';
    
    const result = await pool.query(query, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get appointment by ID
app.get('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    
    const result = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [appointmentId, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new appointment
app.post('/api/appointments', authenticateToken, async (req, res) => {
  console.log('Appointment creation request:', req.body);
 
  try {
    const {id, title, description, start_time, end_time, location, participants, status } = req.body;
    
    // Validate request
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ message: 'Please provide title, start_time, and end_time' });
    }
    
    // Process participants data
    let participantsJson = null;
    
    if (participants) {
      // Check if it's already an array
      if (Array.isArray(participants)) {
        participantsJson = JSON.stringify(participants);
      } 
      // If it's a string (comma-separated emails)
      else if (typeof participants === 'string') {
        // Convert comma-separated string to array of objects with email property
        const participantsArray = participants
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0)
          .map(email => ({ email }));
        
        participantsJson = JSON.stringify(participantsArray);
      } else {
        // Handle case where it might be a single object or something else
        participantsJson = JSON.stringify([{ email: participants.toString() }]);
      }
    }
    
    console.log('Processed participants:', participantsJson);
    
    const result = await pool.query(
      `INSERT INTO appointments 
        (user_id, title, description, start_time, end_time, location, participants, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [id, title, description, start_time, end_time, location, participantsJson, status || 'upcoming']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an existing appointment
app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { title, description, start_time, end_time, location, participants, status } = req.body;
    
    // Check if appointment exists and belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [appointmentId, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found or unauthorized' });
    }
    
    // Convert participants array to JSON string if it exists
    const participantsJson = participants ? JSON.stringify(participants) : null;
    
    // Build update query dynamically based on provided fields
    let updateFields = [];
    let queryParams = [appointmentId, req.user.id];
    let paramCounter = 3; // Starting from 3 since $1 and $2 are already used
    
    if (title) {
      updateFields.push(`title = $${paramCounter++}`);
      queryParams.push(title);
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramCounter++}`);
      queryParams.push(description);
    }
    
    if (start_time) {
      updateFields.push(`start_time = $${paramCounter++}`);
      queryParams.push(start_time);
    }
    
    if (end_time) {
      updateFields.push(`end_time = $${paramCounter++}`);
      queryParams.push(end_time);
    }
    
    if (location !== undefined) {
      updateFields.push(`location = $${paramCounter++}`);
      queryParams.push(location);
    }
    
    if (participants !== undefined) {
      updateFields.push(`participants = $${paramCounter++}`);
      queryParams.push(participantsJson);
    }
    
    if (status) {
      updateFields.push(`status = $${paramCounter++}`);
      queryParams.push(status);
    }
    
    // If no fields to update, return the original appointment
    if (updateFields.length === 0) {
      return res.json(checkResult.rows[0]);
    }
    
    // Perform update
    const query = `
      UPDATE appointments 
      SET ${updateFields.join(', ')} 
      WHERE id = $1 AND user_id = $2 
      RETURNING *
    `;
    
    const result = await pool.query(query, queryParams);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an appointment
app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    
    // Check if appointment exists and belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [appointmentId, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found or unauthorized' });
    }
    
    // Delete appointment
    await pool.query('DELETE FROM appointments WHERE id = $1 AND user_id = $2', [appointmentId, req.user.id]);
    
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, timezone } = req.body;
    
    // Build update query based on provided fields
    let updateFields = [];
    let queryParams = [req.user.id];
    let paramCounter = 2; // Starting from 2 since $1 is already used
    
    if (name) {
      updateFields.push(`name = $${paramCounter++}`);
      queryParams.push(name);
    }
    
    if (timezone) {
      updateFields.push(`timezone = $${paramCounter++}`);
      queryParams.push(timezone);
    }
    
    // If no fields to update, return error
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    // Perform update
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $1 
      RETURNING id, name, email, timezone
    `;
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Connect calendar (placeholder for Nylas integration)
app.post('/api/calendars/connect', authenticateToken, async (req, res) => {
  try {
    const { name, provider, accessToken, refreshToken, tokenExpiry } = req.body;
    
    // Validate request
    if (!name || !provider || !accessToken) {
      return res.status(400).json({ message: 'Please provide name, provider, and accessToken' });
    }
    
    // Insert new calendar connection
    const result = await pool.query(
      `INSERT INTO calendars 
        (user_id, name, provider, access_token, refresh_token, token_expiry) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, provider`,
      [req.user.id, name, provider, accessToken, refreshToken, tokenExpiry]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Connect calendar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's calendars
app.get('/api/calendars', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, provider, description FROM calendars WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a Google Meet link
app.post('/api/google-meet', async (req, res) => {
  try {
    const { accessToken, eventDetails } = req.body;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }

    // Log the received event details for debugging
    console.log('Event details received:', JSON.stringify(eventDetails, null, 2));
    
    // Extract start and end times from the event details
    // The frontend sends nested objects, handle both formats
    let startDateTime, endDateTime, timeZone;
    
    if (eventDetails.start && eventDetails.start.dateTime) {
      // Handle nested format from frontend
      startDateTime = eventDetails.start.dateTime;
      endDateTime = eventDetails.end?.dateTime;
      timeZone = eventDetails.start.timeZone || 'UTC';
    } else if (eventDetails.startTime) {
      // Handle flat format
      startDateTime = eventDetails.startTime;
      endDateTime = eventDetails.endTime;
      timeZone = eventDetails.timezone || 'UTC';
    } else {
      return res.status(400).json({ error: 'Missing start/end time information' });
    }
    
    // Ensure we have valid ISO format dates for both start and end
    if (!startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Invalid start or end time' });
    }
    
    // Get other event details
    const summary = eventDetails.summary || eventDetails.title || 'New Meeting';
    const description = eventDetails.description || 'Meeting created via MeetNing';
    
    // Extract attendees, handling different formats
    let attendees = [];
    if (eventDetails.attendees && Array.isArray(eventDetails.attendees)) {
      attendees = eventDetails.attendees;
    } else if (eventDetails.participants && Array.isArray(eventDetails.participants)) {
      attendees = eventDetails.participants.map(email => ({ email }));
    }
    
    console.log('Preparing to create event with:', {
      summary,
      startDateTime,
      endDateTime,
      timeZone,
      attendees: attendees.length
    });
    
    // Make request to Google Calendar API to create an event with conferencing
    const response = await axios({
      method: 'POST',
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        summary,
        description,
        start: {
          dateTime: startDateTime,
          timeZone
        },
        end: {
          dateTime: endDateTime,
          timeZone
        },
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        attendees: attendees.length > 0 ? attendees : []
      },
      params: {
        conferenceDataVersion: 1
      }
    });
    
    // Log response data for debugging
    console.log('Google Calendar API response:', JSON.stringify(response.data, null, 2));

    // Extract the Google Meet link
    const meetLink = response.data.hangoutLink || 
                    (response.data.conferenceData && 
                     response.data.conferenceData.entryPoints && 
                     response.data.conferenceData.entryPoints.find(e => e.uri).uri);

    if (!meetLink) {
      return res.status(400).json({ error: 'Failed to create Google Meet link' });
    }

    // Return the meet link
    return res.status(200).json({ 
      meetLink,
      eventId: response.data.id
    });
  } catch (error) {
    console.error('Google Meet creation error:', error.response ? error.response.data : error.message);
    return res.status(500).json({ 
      error: 'Failed to create Google Meet', 
      details: error.response ? error.response.data : error.message 
    });
  }
});

// Start server and initialize database
app.listen(port, async () => {
  console.log(`MeetNing Appointment AI API listening on port ${port}`);
  await initDatabase();
});
