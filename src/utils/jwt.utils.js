const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'BrightNimbusworldwoin2025';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

/**
 * Utilities for JWT token handling
 */
class JwtUtils {
  /**
   * Create a JWT access token
   * @param {Object} userData - User data to encode in token
   * @returns {string} JWT token
   */
  createAccessToken(userData) {
    return jwt.sign(userData, JWT_SECRET, {
      expiresIn: JWT_EXPIRATION
    });
  }

  /**
   * Verify a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token data
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new JwtUtils();