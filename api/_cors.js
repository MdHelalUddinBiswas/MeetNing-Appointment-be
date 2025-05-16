// Shared CORS handler for all API routes

const allowedOrigins = [
  "http://localhost:3000", // Local frontend
  "http://localhost:8000", // Local backend
  "https://meet-ning-appointment-fe-2bci.vercel.app", // Production frontend
  "https://meet-ning-appointment-be.vercel.app", // Production backend
  "https://meet-ning-appointment-fe.vercel.app", // Production frontend (alternate)
  "https://meet-ning-fe.vercel.app", // Short domain if used
  "https://meetning.vercel.app" // Short domain if used
];

// Add CORS headers to API responses
function corsHandler(req, res) {
  // Get the request origin
  const origin = req.headers.origin;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'x-auth-token, Authorization, Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  // Set allowed origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // In development, allow all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  return false;
}

module.exports = corsHandler;
