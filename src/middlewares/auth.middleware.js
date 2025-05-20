const jwtUtils = require('../utils/jwt.utils.js');

/**
 * Middleware for authentication
 */
class AuthMiddleware {
  /**
   * Verify JWT token middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header missing' });
      }
      
      const parts = authHeader.split(' ');
      
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid authorization format' });
      }
      
      const token = parts[1];
      
      const decoded = jwtUtils.verifyToken(token);
      req.user = decoded;
      
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }
}

module.exports = new AuthMiddleware();