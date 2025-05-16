// Serverless entry point for Vercel
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Import Prisma singleton client
const prisma = require('../prisma/client');

// Create a new Express app specifically for serverless
const app = express();

// Add middleware
app.use(cors());
app.use(express.json());

// Simple health check route
app.get('/', (req, res) => {
  res.send('MeetNing API is running');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MeetNing Appointment AI API is running',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
app.get('/api/db-test', async (req, res) => {
  try {
    // Test the database connection with a simple query
    const result = await prisma.$queryRaw`SELECT NOW()`;
    res.json({
      status: 'ok',
      message: 'Database connection successful',
      timestamp: result[0].now
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  // Get token from header - support multiple formats
  let token = req.header("x-auth-token");

  // Also check for Authorization header with Bearer token
  const authHeader = req.header("Authorization");
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

// Register a new user
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, timezone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        timezone: timezone || "UTC"
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// Login user
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Get all appointments for a user
app.get("/api/appointments", authenticateToken, async (req, res) => {
  try {
    const status = req.query.status; // Filter by status if provided

    const whereClause = { 
      userId: req.user.id 
    };
    
    if (status) {
      whereClause.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json(appointments);
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get appointment by ID
app.get("/api/appointments/:id", authenticateToken, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        userId: req.user.id
      }
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json(appointment);
  } catch (error) {
    console.error("Get appointment error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new appointment
app.post("/api/appointments", authenticateToken, async (req, res) => {
  try {
    // Get user ID from the authenticated token
    const userId = req.user.id;
    const { title, description, startTime, endTime, location, participants, status } = req.body;

    // Validate request
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ 
        message: "Please provide title, start_time, and end_time" 
      });
    }

    // Process participants if provided
    let participantsJson = null;
    if (participants) {
      participantsJson = Array.isArray(participants) ? participants : [participants];
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        userId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        participants: participantsJson,
        status: status || "upcoming"
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update an existing appointment
app.put("/api/appointments/:id", authenticateToken, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { title, description, startTime, endTime, location, participants, status } = req.body;

    // Check if appointment exists and belongs to user
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        userId: req.user.id
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({ message: "Appointment not found or unauthorized" });
    }

    // Process participants if provided
    let participantsJson = undefined;
    if (participants) {
      participantsJson = Array.isArray(participants) ? participants : [participants];
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (location !== undefined) updateData.location = location;
    if (participantsJson !== undefined) updateData.participants = participantsJson;
    if (status) updateData.status = status;

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData
    });

    res.json(updatedAppointment);
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete an appointment
app.delete("/api/appointments/:id", authenticateToken, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);

    // Check if appointment exists and belongs to user
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        userId: req.user.id
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({ message: "Appointment not found or unauthorized" });
    }

    // Delete appointment
    await prisma.appointment.delete({
      where: { id: appointmentId }
    });

    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("Delete appointment error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Export the Express app as the serverless function handler
module.exports = app;
