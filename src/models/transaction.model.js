const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['CHAT', 'JOB_LINK', 'DEPOSIT'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  worldIdTransactionId: String,
  metadata: {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);