const express = require('express');
const jobController = require('../controllers/job.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const router = express.Router();

/**
 * @route   GET /api/jobs
 * @desc    Get jobs with filtering and pagination
 * @access  Public
 */
router.get('/', jobController.getJobs);

/**
 * @route   GET /api/jobs/categories
 * @desc    Get job categories
 * @access  Public
 */
router.get('/categories', jobController.getCategories);

/**
 * @route   GET /api/jobs/user
 * @desc    Get user's job interactions
 * @access  Private
 */
router.get('/user', authMiddleware.verifyToken, jobController.getUserJobs);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get a job by ID
 * @access  Public
 */
router.get('/:id', jobController.getJobById);

/**
 * @route   POST /api/jobs/:id/status
 * @desc    Update job status (interested or discarded)
 * @access  Private
 */
router.post('/:id/status', authMiddleware.verifyToken, jobController.updateJobStatus);

/**
 * @route   POST /api/jobs/:id/link
 * @desc    Start process to generate job application link
 * @access  Private
 */
router.post('/:id/link', authMiddleware.verifyToken, jobController.generateJobLink);

/**
 * @route   POST /api/jobs/complete-link
 * @desc    Complete link generation after payment
 * @access  Private
 */
router.post('/complete-link', authMiddleware.verifyToken, jobController.completeJobLink);

module.exports = router;