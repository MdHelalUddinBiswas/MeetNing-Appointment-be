// Serverless entry point for Vercel
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Create express app
const app = express();

// CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:8000",
  "https://meet-ning-appointment-fe-2bci.vercel.app",
  "https://meet-ning-appointment-be.vercel.app"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(null, true); // Allow all origins for now
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

app.use(express.json());

// Database setup
let poolConfig;
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
} else {
  poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'appointment_ai',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432
  };
}

const pool = new Pool(poolConfig);

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to MeetNing Appointment AI API',
    status: 'online',
    time: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the MeetNing Appointment AI API' });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MeetNing Appointment AI API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.status(200).json({
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

// Export the Express API
module.exports = app;
