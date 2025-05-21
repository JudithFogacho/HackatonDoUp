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
      console.log('Verification data received:', {
        action: req.body.action,
        credential_type: req.body.credential_type,
        nullifier_hash: req.body.nullifier_hash ? (req.body.nullifier_hash.substring(0, 10) + '...') : 'missing'
      });
      
      // Validate required fields
      if (!req.body.merkle_root || !req.body.nullifier_hash || !req.body.proof) {
        return res.status(400).json({ error: 'Missing required verification parameters' });
      }
      
      // Verify the proof with World ID
      const result = await worldIdService.verifyProof({
        merkle_root: req.body.merkle_root,
        nullifier_hash: req.body.nullifier_hash,
        proof: req.body.proof,
        credential_type: req.body.credential_type || 'orb',
        action: req.body.action || 'doup-user-verification',
        signal: req.body.signal || ''
      });
      
      // Check if user exists by nullifier hash
      let user = await UserModel.findOne({ worldIdNullifierHash: req.body.nullifier_hash });
      
      // Create user if doesn't exist
      if (!user) {
        user = new UserModel({
          worldIdNullifierHash: req.body.nullifier_hash,
          nickname: `User_${req.body.nullifier_hash.substring(0, 6)}`,
          createdAt: new Date()
        });
        await user.save();
        console.log('New World ID user created with ID:', user._id);
      } else {
        console.log('Existing World ID user found:', user._id);
      }
      
      // Create JWT token
      const token = jwtUtils.createAccessToken({ 
        userId: user._id,
        nickname: user.nickname,
        worldIdVerified: true
      });
      
      return res.status(200).json({ 
        status: 'success', 
        token,
        user: {
          id: user._id,
          nickname: user.nickname,
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
        console.error('API response error data:', error.response.data);
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
          nickname: userProfile.username || `user_${Math.random().toString(36).substring(2, 10)}`,
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
      const { walletAddress, nickname, profilePictureUrl } = req.body;
      
      console.log('Attempting wallet authentication with:', { 
        walletAddress: walletAddress?.substring(0, 10),
        nickname 
      });
      
      // Find user by wallet address or create new
      let user;
      
      if (walletAddress) {
        user = await UserModel.findOne({ walletAddress });
      }
      
      // Create new user if doesn't exist
      if (!user) {
        user = new UserModel({
          nickname: nickname || `user_${Math.random().toString(36).substring(2, 10)}`,
          walletAddress,
          profilePicture: profilePictureUrl,
          createdAt: new Date()
        });
        await user.save();
        console.log('New user created:', user._id);
      } else {
        // Update existing user information
        if (nickname) user.nickname = nickname;
        if (profilePictureUrl) user.profilePicture = profilePictureUrl;
        await user.save();
        console.log('Existing user updated:', user._id);
      }
      
      // Create JWT token
      const token = jwtUtils.createAccessToken({ 
        userId: user._id,
        nickname: user.nickname,
        walletAddress: user.walletAddress
      });
      
      return res.status(200).json({ 
        token, 
        user: {
          id: user._id,
          nickname: user.nickname,
          walletAddress: user.walletAddress,
          profilePicture: user.profilePicture
        }
      });
    } catch (error) {
      console.error('Wallet authentication error:', error);
      return res.status(401).json({ error: 'Authentication failed: ' + (error.message || '') });
    }
  }

  async demoLogin(req, res) {
    try {
      const { nickname } = req.body;
      console.log('Initiating demo login for:', nickname);
      
      // Generate a unique random "wallet address" to avoid duplicates
      const randomWalletAddress = 'demo_' + Math.random().toString(36).substring(2, 15);
      
      // Make sure the nickname is correctly assigned to username
      const username = nickname || `DemoUser_${Math.random().toString(36).substring(2, 10)}`;
      
      // Create a temporary demo user with a unique address
      const user = new UserModel({
        nickname: username, // Use the username variable created above
        walletAddress: randomWalletAddress, // Use a unique address to avoid duplicate errors
        createdAt: new Date()
      });
      
      await user.save();
      console.log('Demo user created with ID:', user._id);
      
      // Create JWT token
      const token = jwtUtils.createAccessToken({ 
        userId: user._id,
        nickname: username, // Use the username variable created above
        walletAddress: user.walletAddress,
        isDemoUser: true
      });
      
      console.log('Demo login completed for:', username); // Use the username variable created above
      
      return res.status(200).json({ 
        token, 
        user: {
          id: user._id,
          nickname: username, // Use the username variable created above
          isDemoUser: true
        }
      });
    } catch (error) {
      console.error('Demo login error:', error);
      return res.status(500).json({ error: 'Demo authentication failed: ' + (error.message || '') });
    }
  }
}

module.exports = new AuthController();