// Simple standalone health endpoint for Vercel

module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'MeetNing Appointment AI API is running',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
};
