const worldIdService = require('../services/world-id.service.js');
const jwtUtils = require('../utils/jwt.utils.js');
const UserModel = require('../models/user.model.js');

// Store for temporary nonces
const nonceStore = new Map();

/**
 * Controller for handling authentication
 */
class AuthController {
  /**
   * Generate a nonce for authentication
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getNonce(req, res) {
    try {
      const nonce = worldIdService.generateNonce();
      
      // Store nonce with timestamp
      nonceStore.set(nonce, Date.now());
      
      // Clean expired nonces after 5 minutes
      setTimeout(() => {
        if (nonceStore.has(nonce)) {
          nonceStore.delete(nonce);
        }
      }, 5 * 60 * 1000);
      
      return res.status(200).json({ nonce });
    } catch (error) {
      console.error('Nonce generation error:', error);
      return res.status(500).json({ error: 'Failed to generate nonce' });
    }
  }

  /**
   * Verify World ID proof
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyWorldId(req, res) {
    try {
      console.log('Datos de verificación recibidos:', {
        action: req.body.action,
        credential_type: req.body.credential_type
      });
      
      // Ya no necesitamos verificar nonces, World ID se encarga de eso
      const result = await worldIdService.verifyProof(req.body);
      
      // Check if user exists by nullifier hash
      let user = await UserModel.findOne({ worldIdNullifierHash: req.body.nullifier_hash });
      
      // Create user if doesn't exist
      if (!user) {
        user = new UserModel({
          worldIdNullifierHash: req.body.nullifier_hash,
          createdAt: new Date()
        });
        await user.save();
      }
      
      // Create JWT token
      const token = jwtUtils.createAccessToken({ userId: user._id });
      
      return res.status(200).json({ 
        status: 'success', 
        token,
        user: {
          id: user._id,
          worldIdVerified: true
        }
      });
    } catch (error) {
      console.error('World ID verification error:', error);
      let errorMessage = 'Verification failed';
      
      if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      if (error.response && error.response.data) {
        errorMessage += ' - ' + JSON.stringify(error.response.data);
      }
      
      return res.status(401).json({ 
        error: errorMessage,
        code: error.response?.status || 500
      });
    }
  }

  /**
   * Handle OAuth callback
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async oauthCallback(req, res) {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
      }
      
      // Get redirect URI from config or env
      const redirectUri = process.env.WORLD_ID_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
      
      // Exchange code for token
      const tokenData = await worldIdService.getOAuthToken(code, redirectUri);
      
      // Get user profile with token
      const userProfile = await worldIdService.getUserProfile(tokenData.access_token);
      
      // Find or create user
      let user = await UserModel.findOne({ worldIdNullifierHash: userProfile.nullifier_hash });
      
      if (!user) {
        user = new UserModel({
          worldIdNullifierHash: userProfile.nullifier_hash,
          username: userProfile.username || `user_${Math.random().toString(36).substring(2, 10)}`,
          profilePicture: userProfile.profile_picture,
          createdAt: new Date()
        });
        await user.save();
      }
      
      // Create JWT token
      const token = jwtUtils.createAccessToken({ userId: user._id });
      
      // Redirect to frontend with token
      // In production, you might want to use a more secure method
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-success?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-error`);
    }
  }

  /**
   * Authenticate with wallet
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async walletAuth(req, res) {
    try {
      const { nonce, username, walletAddress, profilePictureUrl } = req.body;
      
      console.log('Intentando autenticación alternativa con nonce:', nonce);
      console.log('Nonces disponibles:', Array.from(nonceStore.keys()));
      
      // Validar el nonce
      if (!nonce || !nonceStore.has(nonce)) {
        return res.status(401).json({ error: 'Invalid nonce' });
      }
      
      const timestamp = nonceStore.get(nonce);
      // Check if nonce is expired (5 minutes)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        nonceStore.delete(nonce);
        return res.status(401).json({ error: 'Nonce expired' });
      }
      
      // Delete used nonce
      nonceStore.delete(nonce);
      console.log('Nonce validado y eliminado:', nonce);
      
      // Find user by wallet address or create new
      let user;
      
      if (walletAddress) {
        user = await UserModel.findOne({ walletAddress });
      }
      
      // Create new user if doesn't exist
      if (!user) {
        user = new UserModel({
          username: username || `user_${Math.random().toString(36).substring(2, 10)}`,
          walletAddress, // Esto puede ser null/undefined, pero está bien
          profilePicture: profilePictureUrl,
          createdAt: new Date()
        });
        await user.save();
        console.log('Nuevo usuario creado:', user._id);
      } else {
        // Update existing user information
        if (username) user.username = username;
        if (profilePictureUrl) user.profilePicture = profilePictureUrl;
        await user.save();
        console.log('Usuario existente actualizado:', user._id);
      }
      
      // Create JWT token
      const token = jwtUtils.createAccessToken({ 
        userId: user._id,
        username: user.username,
        walletAddress: user.walletAddress
      });
      
      return res.status(200).json({ 
        token, 
        user: {
          id: user._id,
          username: user.username
        }
      });
    } catch (error) {
      console.error('Wallet authentication error:', error);
      return res.status(401).json({ error: 'Authentication failed: ' + (error.message || '') });
    }
  }
}

module.exports = new AuthController();