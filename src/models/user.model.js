const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  worldIdNullifierHash: { 
    type: String, 
    sparse: true,
    index: true
  },
  nickname: {
    type: String,
    default: function() {
      return `user_${Math.random().toString(36).substring(2, 10)}`;
    }
  },
  walletAddress: { 
    type: String, 
    sparse: true,
    index: true
  },
  profilePicture: String,
  contactInfo: {
    email: String,
    phone: String
  },
  professionalInfo: {
    hourlyRate: {
      type: Number,
      default: 0
    },
    skills: [String],
    categories: [String],
    availability: [Object],
    experience: String,
    education: String
  },
  preferences: {
    privacySettings: { type: Object, default: {} },
    notificationSettings: { type: Object, default: {} },
    jobCategories: [String],
    jobTypes: [String],
    locations: [String],
    remoteOnly: { type: Boolean, default: false }
  },
  statistics: {
    linksGenerated: { type: Number, default: 0 },
    paymentsProcessed: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);