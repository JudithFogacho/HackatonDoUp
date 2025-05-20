const UserModel = require('../models/user.model.js');
const UserJobModel = require('../models/user-job.model.js');
const TransactionModel = require('../models/transaction.model.js');

/**
 * Service for handling user profile operations
 */
class ProfileService {
  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(userId) {
    try {
      const user = await UserModel.findById(userId).select('-worldIdNullifierHash');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated user profile
   */
  async updateUserProfile(userId, profileData) {
    try {
      // Filter out fields that shouldn't be updated directly
      const allowedFields = [
        'nickname',
        'contactInfo',
        'professionalInfo',
        'preferences'
      ];
      
      const updateData = {};
      
      // Only copy allowed fields
      allowedFields.forEach(field => {
        if (profileData[field] !== undefined) {
          updateData[field] = profileData[field];
        }
      });
      
      // Add updatedAt field
      updateData.updatedAt = new Date();
      
      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true }
      ).select('-worldIdNullifierHash');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Get user's statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStatistics(userId) {
    try {
      // Get user's statistics
      const user = await UserModel.findById(userId).select('statistics');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get additional statistics
      const appliedJobs = await UserJobModel.countDocuments({
        userId,
        status: 'APPLIED'
      });
      
      const interestedJobs = await UserJobModel.countDocuments({
        userId,
        status: 'INTERESTED'
      });
      
      const discardedJobs = await UserJobModel.countDocuments({
        userId,
        status: 'DISCARDED'
      });
      
      const totalTransactions = await TransactionModel.countDocuments({
        userId,
        status: 'COMPLETED'
      });
      
      const totalSpent = await TransactionModel.aggregate([
        {
          $match: {
            userId: userId,
            status: 'COMPLETED'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      
      return {
        ...user.statistics.toObject(),
        appliedJobs,
        interestedJobs,
        discardedJobs,
        totalTransactions,
        totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw new Error('Failed to get user statistics');
    }
  }

  /**
   * Get user's transaction history
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Transaction history
   */
  async getTransactionHistory(userId) {
    try {
      const transactions = await TransactionModel.find({ userId })
        .sort({ createdAt: -1 });
      
      return transactions;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw new Error('Failed to get transaction history');
    }
  }

  /**
   * Get user's generated links
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Generated links
   */
  async getGeneratedLinks(userId) {
    try {
      const links = await UserJobModel.find({
        userId,
        generatedLink: { $exists: true, $ne: null }
      })
        .populate('jobId', 'title company location')
        .populate('transactionId', 'amount createdAt')
        .sort({ updatedAt: -1 });
      
      return links;
    } catch (error) {
      console.error('Error getting generated links:', error);
      throw new Error('Failed to get generated links');
    }
  }
}

module.exports = new ProfileService();