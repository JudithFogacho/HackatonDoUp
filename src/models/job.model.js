const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: [String],
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  location: {
    type: String,
    required: true
  },
  remote: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP'],
    default: 'FULL_TIME'
  },
  category: {
    type: String,
    required: true
  },
  postedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  },
  applicationUrl: String,
  contactEmail: String
});

// Índice para búsqueda por texto
JobSchema.index({ title: 'text', description: 'text', company: 'text', location: 'text' });

module.exports = mongoose.model('Job', JobSchema);