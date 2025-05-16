// Standalone serverless handler for Vercel
const express = require('express');

// Import auth handlers
const loginHandler = require('./auth/login');
const signupHandler = require('./auth/signup');

// Create a minimal express app for serverless
const app = express();

// Add CORS headers directly to responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-auth-token, Authorization');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Define basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'MeetNing Appointment AI API',
    status: 'online',
    time: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MeetNing Appointment AI API is running',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    version: '1.1.0'
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    message: 'Welcome to the MeetNing Appointment AI API',
    endpoints: [
      '/api/health',
      '/api/auth/login',
      '/api/auth/signup'
    ]
  });
});

// Auth routes
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/signup', signupHandler);

// Add error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// Export serverless handler
module.exports = app;
