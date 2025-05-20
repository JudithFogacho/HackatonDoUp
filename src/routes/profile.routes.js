const express = require('express');
const profileController = require('../controllers/profile.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const router = express.Router();

/**
 * @route   GET /api/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/', authMiddleware.verifyToken, profileController.getProfile);

/**
 * @route   PUT /api/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/', authMiddleware.verifyToken, profileController.updateProfile);

/**
 * @route   GET /api/profile/statistics
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/statistics', authMiddleware.verifyToken, profileController.getStatistics);

/**
 * @route   GET /api/profile/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/transactions', authMiddleware.verifyToken, profileController.getTransactionHistory);

/**
 * @route   GET /api/profile/links
 * @desc    Get generated links
 * @access  Private
 */
router.get('/links', authMiddleware.verifyToken, profileController.getGeneratedLinks);

module.exports = router;