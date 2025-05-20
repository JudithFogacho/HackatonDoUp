const JobModel = require('../models/job.model.js');
const UserJobModel = require('../models/user-job.model.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Service for handling job operations
 */
class JobService {
  /**
   * Get jobs from API
   * @returns {Promise<Array>} Array of jobs
   */
  async getJobsFromApi() {
    try {
      // Replace with actual API endpoint
      const response = await axios.get('https://api.example.com/jobs');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch jobs from API:', error);
      // Fallback to local JSON if API fails
      return this.getJobsFromJson();
    }
  }

  /**
   * Get jobs from local JSON file
   * @returns {Promise<Array>} Array of jobs
   */
  async getJobsFromJson() {
    try {
      const filePath = path.join(__dirname, '../../data/jobs.json');
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read jobs from JSON:', error);
      return [];
    }
  }

  /**
   * Seed database with jobs
   * @returns {Promise<void>}
   */
  async seedJobs() {
    try {
      const count = await JobModel.countDocuments();
      
      // Only seed if there are no jobs
      if (count === 0) {
        let jobs;
        
        try {
          jobs = await this.getJobsFromApi();
        } catch (error) {
          jobs = await this.getJobsFromJson();
        }
        
        if (jobs && jobs.length > 0) {
          await JobModel.insertMany(jobs);
          console.log(`Seeded ${jobs.length} jobs`);
        }
      }
    } catch (error) {
      console.error('Job seeding error:', error);
    }
  }

  /**
   * Get jobs with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated jobs
   */
  async getJobs(filters = {}, pagination = { page: 1, limit: 10 }) {
    try {
      const query = {};
      
      // Apply filters
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
      
      if (filters.category) {
        query.category = filters.category;
      }
      
      if (filters.type) {
        query.type = filters.type;
      }
      
      if (filters.location) {
        query.location = { $regex: new RegExp(filters.location, 'i') };
      }
      
      if (filters.remote) {
        query.remote = filters.remote === 'true';
      }
      
      if (filters.minSalary) {
        query['salary.min'] = { $gte: Number(filters.minSalary) };
      }
      
      // Only show active jobs
      query.active = true;
      
      // Calculate pagination
      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const skip = (page - 1) * limit;
      
      // Execute query with pagination
      const jobs = await JobModel.find(query)
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await JobModel.countDocuments(query);
      
      return {
        jobs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting jobs:', error);
      throw new Error('Failed to get jobs');
    }
  }

  /**
   * Get a single job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job object
   */
  async getJobById(jobId) {
    try {
      const job = await JobModel.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      return job;
    } catch (error) {
      console.error('Error getting job:', error);
      throw new Error('Failed to get job');
    }
  }

  /**
   * Mark a job as interested or discarded
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   * @param {string} status - Status (INTERESTED or DISCARDED)
   * @returns {Promise<Object>} Updated user-job relation
   */
  async updateJobStatus(userId, jobId, status) {
    try {
      // Validate status
      if (!['INTERESTED', 'DISCARDED'].includes(status)) {
        throw new Error('Invalid status');
      }
      
      const job = await JobModel.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      // Find or create user-job relation
      let userJob = await UserJobModel.findOne({ userId, jobId });
      
      if (userJob) {
        userJob.status = status;
        userJob.updatedAt = new Date();
      } else {
        userJob = new UserJobModel({
          userId,
          jobId,
          status
        });
      }
      
      await userJob.save();
      return userJob;
    } catch (error) {
      console.error('Error updating job status:', error);
      throw new Error('Failed to update job status');
    }
  }

  /**
   * Generate application link for a job
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Updated user-job relation with link
   */
  async generateJobLink(userId, jobId, transactionId) {
    try {
      const job = await JobModel.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      // Find user-job relation
      let userJob = await UserJobModel.findOne({ userId, jobId });
      
      if (!userJob) {
        userJob = new UserJobModel({
          userId,
          jobId,
          status: 'INTERESTED'
        });
      }
      
      // Generate unique application link
      const uniqueId = Math.random().toString(36).substring(2, 15);
      const generatedLink = `${process.env.API_BASE_URL || 'http://localhost:3000'}/apply/${jobId}/${uniqueId}`;
      
      userJob.generatedLink = generatedLink;
      userJob.status = 'APPLIED';
      userJob.transactionId = transactionId;
      userJob.updatedAt = new Date();
      
      await userJob.save();
      
      // Update user statistics
      await this.updateUserStatistics(userId);
      
      return userJob;
    } catch (error) {
      console.error('Error generating job link:', error);
      throw new Error('Failed to generate job link');
    }
  }

  /**
   * Update user statistics
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async updateUserStatistics(userId) {
    try {
      const User = require('../models/user.model.js'); // Importing here to avoid circular dependency
      
      // Count links generated
      const linksCount = await UserJobModel.countDocuments({
        userId,
        generatedLink: { $exists: true, $ne: null }
      });
      
      // Update user statistics
      await User.findByIdAndUpdate(userId, {
        'statistics.linksGenerated': linksCount
      });
    } catch (error) {
      console.error('Error updating user statistics:', error);
      // Don't throw here to prevent blocking the main operation
    }
  }

  /**
   * Get job categories
   * @returns {Promise<Array>} Array of categories
   */
  async getCategories() {
    try {
      const categories = await JobModel.distinct('category');
      return categories;
    } catch (error) {
      console.error('Error getting job categories:', error);
      throw new Error('Failed to get job categories');
    }
  }

  /**
   * Get user's job interactions
   * @param {string} userId - User ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Array of job interactions
   */
  async getUserJobs(userId, status = null) {
    try {
      const query = { userId };
      
      if (status) {
        query.status = status;
      }
      
      const userJobs = await UserJobModel.find(query)
        .populate('jobId')
        .sort({ updatedAt: -1 });
      
      return userJobs;
    } catch (error) {
      console.error('Error getting user jobs:', error);
      throw new Error('Failed to get user jobs');
    }
  }
}

module.exports = new JobService();