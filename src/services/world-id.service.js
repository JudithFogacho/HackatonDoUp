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
      verification_level: verificationData.credential_type || 'orb',
      action: verificationData.action || worldIdConfig.ACTION_NAME,
      signal: verificationData.signal || ''
    };
  
    console.log('Sending verification to World ID:', {
      action: payload.action,
      verification_level: payload.verification_level,
      merkle_root: payload.merkle_root ? `${payload.merkle_root.substring(0, 10)}...` : 'missing',
      nullifier_hash: payload.nullifier_hash ? `${payload.nullifier_hash.substring(0, 10)}...` : 'missing',
    });
  
    try {
      const verifyUrl = `${worldIdConfig.API_BASE_URL}/verify`;
      console.log('Verify URL:', verifyUrl);
      
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
      
      // Provide specific error message based on the response
      if (error.response && error.response.data) {
        const errorCode = error.response.data.code;
        const errorMessage = error.response.data.detail || error.response.data.message || 'Unknown error';
        
        if (errorCode === 'invalid_proof') {
          throw new Error(`Invalid proof: ${errorMessage}`);
        } else if (errorCode === 'invalid_nullifier') {
          throw new Error(`Invalid nullifier hash: ${errorMessage}`);
        } else if (errorCode === 'invalid_merkle_root') {
          throw new Error(`Invalid merkle root: ${errorMessage}`);
        } else {
          throw new Error(`Verification failed (${errorCode}): ${errorMessage}`);
        }
      }
      
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  /**
   * Generates a nonce for wallet authentication
   * @param {number} length - Length of the nonce
   * @returns {string} Generated nonce
   */
  generateNonce(length = 16) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    
    // Create a cryptographically secure random string
    const randomValues = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
      
      for (let i = 0; i < length; i++) {
        nonce += characters.charAt(randomValues[i] % characters.length);
      }
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < length; i++) {
        nonce += characters.charAt(Math.floor(Math.random() * characters.length));
      }
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

  /**
   * Verifies a payment transaction with World ID
   * @param {string} transactionId - The World ID transaction ID
   * @returns {Promise<Object>} Transaction verification result
   */
  async verifyPayment(transactionId) {
    const headers = {
      'Authorization': `Bearer ${worldIdConfig.API_KEY}`,
      'Content-Type': 'application/json'
    };

    const url = `${worldIdConfig.API_BASE_URL}/minikit/transaction/${transactionId}?app_id=${worldIdConfig.APP_ID}`;

    try {
      const response = await axios.get(url, { headers });
      console.log('Payment verification successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Payment verification failed:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
      throw new Error('Payment verification failed: ' + (error.response?.data?.message || error.message));
    }
  }
}

module.exports = new WorldIDService();