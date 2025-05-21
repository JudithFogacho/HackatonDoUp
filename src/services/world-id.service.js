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
    // Prepare headers with API key
    const headers = {
      'Authorization': `Bearer ${worldIdConfig.API_KEY}`,
      'Content-Type': 'application/json'
    };
  
    // Prepare the verification payload according to World ID API v2 requirements
    const payload = {
      merkle_root: verificationData.merkle_root,
      nullifier_hash: verificationData.nullifier_hash,
      proof: verificationData.proof,
      verification_level: verificationData.credential_type || 'orb',
      action: verificationData.action || worldIdConfig.ACTION_NAME
    };
  
    console.log('Sending verification to World ID:', {
      action: payload.action,
      verification_level: payload.verification_level
    });
  
    try {
      // Make the verification request to World ID's API
      const verifyUrl = `${worldIdConfig.API_BASE_URL}/verify`;
      const response = await axios.post(verifyUrl, payload, { headers });
      
      console.log('World ID verification successful');
      return { status: 'verified', data: response.data };
    } catch (error) {
      console.error('World ID verification failed:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
      
      // Rethrow with more details for better debugging
      throw new Error(`Verification failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Generates a secure nonce for wallet authentication
   * @param {number} length - Length of the nonce
   * @returns {string} Generated nonce
   */
  generateNonce(length = 16) {
    // Create more secure nonce with crypto
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    
    // Generate a random string of specified length
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
   * Verifies a payment transaction with World ID
   * @param {string} transactionId - World ID transaction ID
   * @returns {Promise<Object>} Transaction verification result
   */
  async verifyPayment(transactionId) {
    const headers = {
      'Authorization': `Bearer ${worldIdConfig.API_KEY}`,
      'Content-Type': 'application/json'
    };

    try {
      const url = `${worldIdConfig.API_BASE_URL}/minikit/transaction/${transactionId}?app_id=${worldIdConfig.APP_ID}`;
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error('Payment verification failed:', error.response?.data || error.message);
      throw new Error('Payment verification failed');
    }
  }
}

module.exports = new WorldIDService();