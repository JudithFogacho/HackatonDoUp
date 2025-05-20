const jobService = require('../services/job.service.js');
const paymentService = require('../services/payment.service.js');
const UserModel = require('../models/user.model.js');

/**
 * Controller for handling job operations
 */
class JobController {
  /**
   * Get jobs with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getJobs(req, res) {
    try {
      const filters = {
        search: req.query.search,
        category: req.query.category,
        type: req.query.type,
        location: req.query.location,
        remote: req.query.remote,
        minSalary: req.query.minSalary
      };
      
      const pagination = {
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };
      
      const result = await jobService.getJobs(filters, pagination);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getJobs controller:', error);
      return res.status(500).json({ error: 'Failed to get jobs' });
    }
  }

  /**
   * Get a single job by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getJobById(req, res) {
    try {
      const { id } = req.params;
      
      const job = await jobService.getJobById(id);
      
      return res.status(200).json(job);
    } catch (error) {
      console.error('Error in getJobById controller:', error);
      return res.status(404).json({ error: 'Job not found' });
    }
  }

  /**
   * Mark a job as interested or discarded
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateJobStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.userId;
      
      const userJob = await jobService.updateJobStatus(userId, id, status);
      
      return res.status(200).json({ 
        status: 'success',
        jobStatus: userJob.status
      });
    } catch (error) {
      console.error('Error in updateJobStatus controller:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Generate application link for a job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateJobLink(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      // First record the transaction
      const transaction = await paymentService.recordTransaction({
        userId,
        type: 'JOB_LINK',
        amount: 1, // 1 WLD
        metadata: { jobId: id }
      });
      
      // Return the transaction reference for payment processing
      return res.status(200).json({
        status: 'pending',
        message: 'Payment required',
        reference: transaction.reference,
        transactionId: transaction._id
      });
    } catch (error) {
      console.error('Error in generateJobLink controller:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Complete link generation after payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async completeJobLink(req, res) {
    try {
      const { jobId, transactionId } = req.body;
      const userId = req.user.userId;
      
      // Generate the link
      const userJob = await jobService.generateJobLink(userId, jobId, transactionId);
      
      // Update user statistics
      await UserModel.findByIdAndUpdate(userId, {
        $inc: { 'statistics.linksGenerated': 1 }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Link generated successfully',
        link: userJob.generatedLink
      });
    } catch (error) {
      console.error('Error in completeJobLink controller:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get job categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategories(req, res) {
    try {
      const categories = await jobService.getCategories();
      
      return res.status(200).json(categories);
    } catch (error) {
      console.error('Error in getCategories controller:', error);
      return res.status(500).json({ error: 'Failed to get categories' });
    }
  }

  /**
   * Get user's job interactions (interested, discarded, applied)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserJobs(req, res) {
    try {
      const userId = req.user.userId;
      const { status } = req.query;
      
      const userJobs = await jobService.getUserJobs(userId, status);
      
      return res.status(200).json(userJobs);
    } catch (error) {
      console.error('Error in getUserJobs controller:', error);
      return res.status(500).json({ error: 'Failed to get user jobs' });
    }
  }
}

module.exports = new JobController();