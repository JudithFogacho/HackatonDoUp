const express = require('express');
const authController = require('../controllers/auth.controller.js');
const router = express.Router();

/**
 * @route   GET /api/auth/nonce
 * @desc    Get a nonce for authentication
 * @access  Public
 */
router.get('/nonce', authController.getNonce);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify World ID proof
 * @access  Public
 */
router.post('/verify', authController.verifyWorldId);

/**
 * @route   GET /api/auth/callback
 * @desc    Handle OAuth callback from World ID
 * @access  Public
 */
router.get('/callback', authController.oauthCallback);

/**
 * @route   POST /api/auth/login
 * @desc    Complete authentication with wallet
 * @access  Public
 */
router.post('/login', authController.walletAuth);

module.exports = router;