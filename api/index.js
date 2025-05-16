// Simple root API handler for Vercel

module.exports = (req, res) => {
  res.status(200).json({
    message: 'Welcome to the MeetNing Appointment AI API',
    version: '1.0.0',
    status: 'online',
    time: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/ping'
    ]
  });
};
