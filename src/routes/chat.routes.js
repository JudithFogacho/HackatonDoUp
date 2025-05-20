const express = require('express');
const chatController = require('../controllers/chat.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const router = express.Router();

/**
 * @route   POST /api/chat/create
 * @desc    Start process to create a new chat
 * @access  Private
 */
router.post('/create', authMiddleware.verifyToken, chatController.createChat);

/**
 * @route   POST /api/chat/complete
 * @desc    Complete chat creation after payment
 * @access  Private
 */
router.post('/complete', authMiddleware.verifyToken, chatController.completeChat);

/**
 * @route   POST /api/chat/message
 * @desc    Send message to chat
 * @access  Private
 */
router.post('/message', authMiddleware.verifyToken, chatController.sendMessage);

/**
 * @route   GET /api/chat/history
 * @desc    Get chat history
 * @access  Private
 */
router.get('/history', authMiddleware.verifyToken, chatController.getChatHistory);

/**
 * @route   GET /api/chat/:id
 * @desc    Get a chat by ID
 * @access  Private
 */
router.get('/:id', authMiddleware.verifyToken, chatController.getChatById);

module.exports = router;