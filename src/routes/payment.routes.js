const express = require('express');
const paymentController = require('../controllers/payment.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const router = express.Router();

/**
 * @route   GET /api/payments/uuid
 * @desc    Get a UUID for payment reference
 * @access  Public
 */
router.get('/uuid', paymentController.generateUuid);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify a payment transaction
 * @access  Public
 */
router.post('/verify', paymentController.verifyPayment);

/**
 * @route   POST /api/payments/create
 * @desc    Create a payment record
 * @access  Private
 */
router.post('/create', authMiddleware.verifyToken, paymentController.createPayment);

/**
 * @route   POST /api/payments/callback
 * @desc    Handle payment callback from World ID
 * @access  Public
 */
router.post('/callback', paymentController.paymentCallback);

module.exports = router;