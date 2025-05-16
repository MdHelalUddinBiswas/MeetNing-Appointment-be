// Serverless handler for Vercel that adapts the main Express app

// Force setting environment variable for Vercel
process.env.VERCEL = 'true';

// Import the main Express app
const app = require('../index');

// Export the serverless handler
module.exports = app;
