const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  pageType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  pageTitle: {
    type: String,
    required: true,
    trim: true
  },
  pageDescription: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 200
  },
  mobileNumber: {
    type: String,
    trim: true,
    maxlength: 15
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Page', pageSchema); 