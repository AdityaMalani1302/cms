const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  mobileNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Number,
    enum: [0, 1],
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Contact', contactSchema); 