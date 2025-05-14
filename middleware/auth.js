const jwt = require('jsonwebtoken');

/**
 * Authentication middleware that verifies JWT tokens
 * Supports both x-auth-token header and standard Authorization: Bearer token
 */
const authenticateToken = (req, res, next) => {
  // Get token from header - support multiple formats
  let token = req.header('x-auth-token');
  
  // Also check for Authorization header with Bearer token
  const authHeader = req.header('Authorization');
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { authenticateToken };
