// Pure serverless function with no dependencies
// Minimal implementation that should always work

module.exports = (req, res) => {
  // Set CORS headers directly in the response
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-auth-token, Authorization');

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Simple response for health check
  if (req.url === '/api/health' || req.url === '/api/health/') {
    return res.json({
      status: 'ok',
      message: 'MeetNing Appointment AI API is running',
      timestamp: new Date().toISOString()
    });
  }
  
  // Default response
  return res.json({
    message: 'MeetNing API is running',
    status: 'online',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};
