// Serverless entry point for Vercel
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

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

// Add Google OAuth endpoint for integration with frontend
app.get('/api/auth/google/callback', (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ message: 'Missing authorization code' });
  }
  
  // In a real implementation, this would exchange the code for tokens
  // For now, just acknowledge receipt of the code
  res.json({
    status: 'ok',
    message: 'Google OAuth callback received',
    authorizationCode: code
  });
});

// Export the Express app as the serverless function handler
module.exports = app;
