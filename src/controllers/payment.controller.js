const paymentService = require('../services/payment.service.js');

/**
 * Controller for handling payments
 */
class PaymentController {
  /**
   * Generate UUID for payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateUuid(req, res) {
    try {
      const uuid = paymentService.generateUuid();
      return res.status(200).json({ id: uuid });
    } catch (error) {
      console.error('UUID generation error:', error);
      return res.status(500).json({ error: 'Failed to generate UUID' });
    }
  }

  /**
   * Verify payment transaction
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyPayment(req, res) {
    try {
      const { transaction_id, reference } = req.body;
      
      if (!transaction_id) {
        return res.status(400).json({ error: 'Transaction ID is required' });
      }
      
      // Verify the transaction with World ID
      const paymentVerification = await paymentService.verifyPayment(transaction_id);
      
      if (paymentVerification.status !== 'success') {
        return res.status(400).json({ error: 'Payment verification failed' });
      }
      
      // Update transaction status in database
      await paymentService.updateTransactionStatus(
        reference,
        'COMPLETED',
        transaction_id
      );
      
      return res.status(200).json({ 
        status: 'success', 
        message: 'Payment verified successfully' 
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      return res.status(500).json({ error: 'Payment verification failed' });
    }
  }

  /**
   * Create a payment record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createPayment(req, res) {
    try {
      const { userId, type, amount, metadata } = req.body;
      
      // Record transaction in database
      const transaction = await paymentService.recordTransaction({
        userId,
        type,
        amount,
        metadata
      });
      
      return res.status(201).json({
        status: 'success',
        reference: transaction.reference,
        id: transaction._id
      });
    } catch (error) {
      console.error('Payment creation error:', error);
      return res.status(500).json({ error: 'Failed to create payment' });
    }
  }

  /**
   * Handle payment callback
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async paymentCallback(req, res) {
    try {
      const { transaction_id, reference, status } = req.body;
      
      if (!transaction_id || !reference) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Update transaction status
      await paymentService.updateTransactionStatus(
        reference,
        status === 'success' ? 'COMPLETED' : 'FAILED',
        transaction_id
      );
      
      return res.status(200).json({ message: 'Callback processed successfully' });
    } catch (error) {
      console.error('Payment callback error:', error);
      return res.status(500).json({ error: 'Failed to process callback' });
    }
  }
}

module.exports = new PaymentController();