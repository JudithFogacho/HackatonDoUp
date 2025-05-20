const axios = require('axios');
const worldIdConfig = require('../config/world-id.js');

/**
 * Service for handling World ID verification
 */
class WorldIDService {
  /**
   * Verifies a World ID proof
   * @param {Object} verificationData - Proof data from World ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyProof(verificationData) {
    const headers = {
      'Authorization': `Bearer ${worldIdConfig.API_KEY}`,
      'Content-Type': 'application/json'
    };

    const payload = {
      merkle_root: verificationData.merkle_root,
      nullifier_hash: verificationData.nullifier_hash,
      proof: verificationData.proof,
      verification_level: verificationData.credential_type,
      action: verificationData.action || worldIdConfig.ACTION_NAME,
      signal: verificationData.signal || ''
    };

    try {
      const verifyUrl = `${worldIdConfig.API_BASE_URL}/verify`;
      const response = await axios.post(verifyUrl, payload, { headers });
      return { status: 'verified', data: response.data };
    } catch (error) {
      console.error('World ID verification failed:', error.response?.data || error.message);
      throw new Error('Verification failed');
    }
  }

  /**
   * Generates a nonce for wallet authentication
   * @param {number} length - Length of the nonce
   * @returns {string} Generated nonce
   */
  generateNonce(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    
    for (let i = 0; i < length; i++) {
      nonce += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return nonce;
  }

  /**
   * Gets OAuth token from World ID
   * @param {string} code - Authorization code
   * @param {string} redirectUri - Redirect URI
   * @returns {Promise<Object>} OAuth token
   */
  async getOAuthToken(code, redirectUri) {
    try {
      const response = await axios.post(`${worldIdConfig.API_BASE_URL}/oauth/token`, {
        client_id: worldIdConfig.APP_ID,
        client_secret: worldIdConfig.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get OAuth token:', error.response?.data || error.message);
      throw new Error('OAuth token acquisition failed');
    }
  }

  /**
   * Gets user profile from World ID
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${worldIdConfig.API_BASE_URL}/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error.response?.data || error.message);
      throw new Error('User profile acquisition failed');
    }
  }
}

module.exports = new WorldIDService();