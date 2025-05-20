const profileService = require('../services/profile.service.js');

/**
 * Controller for handling user profile operations
 */
class ProfileController {
  /**
   * Get the current user's profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      
      const profile = await profileService.getUserProfile(userId);
      
      return res.status(200).json(profile);
    } catch (error) {
      console.error('Error in getProfile controller:', error);
      return res.status(404).json({ error: 'Profile not found' });
    }
  }

  /**
   * Update the current user's profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const profileData = req.body;
      
      const updatedProfile = await profileService.updateUserProfile(userId, profileData);
      
      return res.status(200).json(updatedProfile);
    } catch (error) {
      console.error('Error in updateProfile controller:', error);
      return res.status(400).json({ error: 'Failed to update profile' });
    }
  }

  /**
   * Get the current user's statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStatistics(req, res) {
    try {
      const userId = req.user.userId;
      
      const statistics = await profileService.getUserStatistics(userId);
      
      return res.status(200).json(statistics);
    } catch (error) {
      console.error('Error in getStatistics controller:', error);
      return res.status(500).json({ error: 'Failed to get statistics' });
    }
  }

  /**
   * Get the current user's transaction history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTransactionHistory(req, res) {
    try {
      const userId = req.user.userId;
      
      const transactions = await profileService.getTransactionHistory(userId);
      
      return res.status(200).json(transactions);
    } catch (error) {
      console.error('Error in getTransactionHistory controller:', error);
      return res.status(500).json({ error: 'Failed to get transaction history' });
    }
  }

  /**
   * Get the current user's generated links
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGeneratedLinks(req, res) {
    try {
      const userId = req.user.userId;
      
      const links = await profileService.getGeneratedLinks(userId);
      
      return res.status(200).json(links);
    } catch (error) {
      console.error('Error in getGeneratedLinks controller:', error);
      return res.status(500).json({ error: 'Failed to get generated links' });
    }
  }
}

module.exports = new ProfileController();