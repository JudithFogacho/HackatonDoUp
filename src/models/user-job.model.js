const mongoose = require('mongoose');

const UserJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  status: {
    type: String,
    enum: ['INTERESTED', 'DISCARDED', 'APPLIED'],
    required: true
  },
  generatedLink: {
    type: String,
    sparse: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto para asegurar que un usuario no tenga duplicados para un trabajo
UserJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('UserJob', UserJobSchema);