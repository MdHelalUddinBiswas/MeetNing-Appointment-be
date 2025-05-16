// Ping endpoint for Vercel with CORS support
const corsHandler = require('./_cors');

module.exports = (req, res) => {
  // Handle CORS
  if (corsHandler(req, res)) return;

  res.status(200).json({
    message: 'pong',
    time: new Date().toISOString()
  });
};
