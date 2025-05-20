const axios = require('axios');
const crypto = require('crypto');
const worldIdConfig = require('../config/world-id.js');
const TransactionModel = require('../models/transaction.model.js');

/**
 * Service for handling World ID payments
 */
class PaymentService {
  /**
   * Generates a UUID for payment reference
   * @returns {string} UUID as string
   */
  generateUuid() {
    return crypto.randomUUID().replace(/-/g, '');
  }

  /**
   * Verifies a payment transaction with World ID
   * @param {string} transactionId - The World ID transaction ID
   * @returns {Promise<Object>} Transaction verification result
   */
  async verifyPayment(transactionId) {
    const headers = {
      'Authorization': `Bearer ${worldIdConfig.API_KEY}`,
      'Content-Type': 'application/json'
    };

    const url = `${worldIdConfig.API_BASE_URL}/minikit/transaction/${transactionId}?app_id=${worldIdConfig.APP_ID}`;

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error('Payment verification failed:', error.response?.data || error.message);
      throw new Error('Payment verification failed');
    }
  }

  /**
   * Records a transaction in the database
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Saved transaction
   */
  async recordTransaction(transactionData) {
    try {
      const transaction = new TransactionModel({
        userId: transactionData.userId,
        type: transactionData.type,
        amount: transactionData.amount,
        status: 'PENDING',
        reference: this.generateUuid(),
        worldIdTransactionId: transactionData.worldIdTransactionId,
        metadata: transactionData.metadata || {}
      });

      return await transaction.save();
    } catch (error) {
      console.error('Failed to record transaction:', error);
      throw new Error('Transaction recording failed');
    }
  }

  /**
   * Updates a transaction status
   * @param {string} reference - Transaction reference
   * @param {string} status - New status
   * @param {string} worldIdTransactionId - World ID transaction ID
   * @returns {Promise<Object>} Updated transaction
   */
  async updateTransactionStatus(reference, status, worldIdTransactionId) {
    try {
      const updatedTransaction = await TransactionModel.findOneAndUpdate(
        { reference },
        { 
          status, 
          worldIdTransactionId,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedTransaction) {
        throw new Error('Transaction not found');
      }

      return updatedTransaction;
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw new Error('Transaction update failed');
    }
  }
}

module.exports = new PaymentService();