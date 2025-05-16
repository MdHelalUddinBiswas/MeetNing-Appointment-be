// Serverless entry point for Vercel
const express = require('express');
const cors = require('cors');

// Create Express app for serverless environment
const app = express();

// Configure CORS to allow requests from frontend domains
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

// Try to import main app routes
try {
  const mainApp = require('../index');
  // If main app is an Express app with routes, use those routes
  if (mainApp && typeof mainApp.use === 'function') {
    app.use('/', mainApp);
  }
} catch (error) {
  console.error('Error importing main app:', error);
  
  // Fallback routes if main app fails to load
  app.use('/api/*', (req, res) => {
    res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'The API is currently being updated. Please try again shortly.'
    });
  });
}

// Export the Express app as the serverless function handler
// module.exports = app;
