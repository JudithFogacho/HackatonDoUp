const chatService = require('../services/chat.service.js');
const paymentService = require('../services/payment.service.js');

/**
 * Controller for handling chat operations
 */
class ChatController {
  /**
   * Create a new chat session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createChat(req, res) {
    try {
      const userId = req.user.userId;
      const { jobId } = req.body;
      
      // First record the transaction
      const transaction = await paymentService.recordTransaction({
        userId,
        type: 'CHAT',
        amount: 1, // 1 WLD
        metadata: { jobId }
      });
      
      // Return the transaction reference for payment processing
      return res.status(200).json({
        status: 'pending',
        message: 'Payment required',
        reference: transaction.reference,
        transactionId: transaction._id
      });
    } catch (error) {
      console.error('Error in createChat controller:', error);
      return res.status(500).json({ error: 'Failed to create chat' });
    }
  }

  /**
   * Complete chat creation after payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async completeChat(req, res) {
    try {
      const userId = req.user.userId;
      const { transactionId, jobId } = req.body;
      
      // Create the chat
      const chat = await chatService.createChat(userId, transactionId, jobId);
      
      return res.status(200).json({
        status: 'success',
        message: 'Chat created successfully',
        chatId: chat._id,
        messages: chat.messages
      });
    } catch (error) {
      console.error('Error in completeChat controller:', error);
      return res.status(500).json({ error: 'Failed to complete chat creation' });
    }
  }

  /**
   * Send message to chat and get AI response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendMessage(req, res) {
    try {
      const { chatId, message } = req.body;
      const userId = req.user.userId;
      
      // Send message and get response
      const chat = await chatService.sendMessage(chatId, message);
      
      // Verify that this chat belongs to the user
      if (chat.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized to access this chat' });
      }
      
      return res.status(200).json({
        status: 'success',
        messages: chat.messages
      });
    } catch (error) {
      console.error('Error in sendMessage controller:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  /**
   * Get chat history for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChatHistory(req, res) {
    try {
      const userId = req.user.userId;
      
      const chats = await chatService.getChatHistory(userId);
      
      return res.status(200).json(chats);
    } catch (error) {
      console.error('Error in getChatHistory controller:', error);
      return res.status(500).json({ error: 'Failed to get chat history' });
    }
  }

  /**
   * Get a specific chat by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChatById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const chat = await chatService.getChatById(id, userId);
      
      return res.status(200).json(chat);
    } catch (error) {
      console.error('Error in getChatById controller:', error);
      return res.status(404).json({ error: 'Chat not found' });
    }
  }
}

module.exports = new ChatController();