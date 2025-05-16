// Root API handler for Vercel with CORS support
const corsHandler = require('./_cors');

module.exports = (req, res) => {
  // Handle CORS
  if (corsHandler(req, res)) return;

  res.status(200).json({
    message: 'Welcome to the MeetNing Appointment AI API',
    version: '1.0.0',
    status: 'online',
    time: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/ping',
      '/api/auth/login',
      '/api/auth/signup'
    ]
  });
};
