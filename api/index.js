const express = require("express");
const cors = require("cors");
const app = express();

// Add CORS middleware to allow frontend requests
app.use(cors({
  origin: function(origin, callback) {
    return callback(null, true); // Allow all origins for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("MeetNing API is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "MeetNing Appointment AI API is running",
    timestamp: new Date().toISOString(),
  });
});

// Export the Express app as the serverless function handler
module.exports = app;
