// Import the main Express app
const app = require('../index');

// This is a special handler for Vercel serverless functions
// It acts as an adapter between Vercel's serverless environment and Express
module.exports = (req, res) => {
  // Mark request as coming from Vercel
  req.isVercel = true;
  
  // Forward the request to the Express app
  return app(req, res);
};
