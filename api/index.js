// Absolutely minimal serverless API implementation
const express = require("express");
const cors = require("cors");

const app = express();

// Add CORS middleware
app.use(cors());
app.use(express.json());

// Health check routes
app.get("/", (req, res) => {
  res.send("MeetNing API is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "MeetNing Appointment AI API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// API information route
app.get("/api", (req, res) => {
  res.json({ 
    message: "Welcome to the MeetNing Appointment AI API",
    endpoints: ["/api/health", "/api/auth/login", "/api/auth/me", "/api/appointments"],
    status: "Minimal version available during maintenance"
  });
});

// Placeholder for authentication routes
app.post("/api/auth/login", (req, res) => {
  res.json({
    message: "Authentication service is under maintenance",
    user: null,
    success: false
  });
});

app.get("/api/auth/me", (req, res) => {
  res.json({
    message: "User profile service is under maintenance",
    user: null
  });
});

// Placeholder for appointment routes
app.get("/api/appointments", (req, res) => {
  res.json({
    message: "Appointment service is under maintenance",
    data: []
  });
});

// Fallback route for all other paths
app.use("*", (req, res) => {
  res.json({
    message: "This endpoint is currently unavailable while we improve the API",
    status: "maintenance"
  });
});

// Export the Express app as the serverless function handler
module.exports = app;
