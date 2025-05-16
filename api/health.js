// Health endpoint for Vercel with CORS support
const corsHandler = require('./_cors');

module.exports = (req, res) => {
  // Handle CORS
  if (corsHandler(req, res)) return;

  res.status(200).json({
    status: 'ok',
    message: 'MeetNing Appointment AI API is running',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
};
