// Import the main Express application
const app = require('../index');

// This serverless function directly exports the full Express app
// All routes and middleware are defined in the main index.js
module.exports = app;
