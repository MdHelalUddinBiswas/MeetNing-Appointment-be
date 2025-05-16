// Simple ping endpoint for testing basic Vercel functionality

module.exports = (req, res) => {
  res.status(200).json({
    message: 'pong',
    time: new Date().toISOString()
  });
};
