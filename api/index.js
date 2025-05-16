// Standalone serverless API implementation
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Add CORS middleware with permissive settings
app.use(cors({
  origin: function(origin, callback) {
    return callback(null, true); // Allow all origins for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

app.use(express.json());

// PostgreSQL connection setup with error handling
let pool;
try {
  let poolConfig;

  if (process.env.DATABASE_URL) {
    // For production (Neon, Supabase, etc)
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    };
    console.log("Using production database connection");
  }

  pool = new Pool(poolConfig);
  
  // Test connection without crashing the app
  pool.query("SELECT NOW()").then(res => {
    console.log("Database connected at:", res.rows[0].now);
  }).catch(err => {
    console.error("Database connection error:", err.message);
  });
} catch (error) {
  console.error("Database setup failed:", error.message);
  // Don't crash the app, continue with limited functionality
}

// Auth Middleware
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

// Health check and API info routes
app.get("/", (req, res) => {
  res.send("MeetNing API is running");
});

app.get("/api", (req, res) => {
  res.json({ message: "Welcome to the MeetNing Appointment AI API" });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "MeetNing Appointment AI API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Core API routes
// These are duplicated from the main app to ensure critical functionality works

// Login route
app.post("/api/auth/login", async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ message: "Database not available" });
    
    const { email, password } = req.body;

    // Check if user exists
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

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

// User profile route
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ message: "Database not available" });
    
    const result = await pool.query(
      "SELECT id, name, email, timezone FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Appointments route
app.get("/api/appointments", authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ message: "Database not available" });
    
    const status = req.query.status; // Filter by status if provided

    let query = "SELECT * FROM appointments WHERE user_id = $1";
    const queryParams = [req.user.id];

    if (status) {
      query += " AND status = $2";
      queryParams.push(status);
    }

    query += " ORDER BY start_time ASC";

    const result = await pool.query(query, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Placeholder for routes that may be missing
// This ensures no 404 errors for integration or meeting routes
app.use("/api/integration", (req, res) => {
  res.status(501).json({
    message: "Integration functionality is not available in this version"
  });
});

app.use("/api/meetings", (req, res) => {
  res.status(501).json({
    message: "Meeting functionality is not available in this version"
  });
});

// Export the Express app as the serverless function handler
module.exports = app;
