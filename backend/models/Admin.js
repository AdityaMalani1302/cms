const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { validatePasswordComplexity } = require('../utils/passwordValidation');

const adminSchema = new mongoose.Schema({
  adminUsername: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  adminPassword: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function(password) {
        const validation = validatePasswordComplexity(password);
        return validation.isValid;
      },
      message: function(props) {
        const validation = validatePasswordComplexity(props.value);
        return validation.errors.join(', ');
      }
    }
  },
  adminEmail: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 120
  },
  adminName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 15
  },
  department: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'Administration'
  },
  role: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'Super Admin'
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500,
    default: 'System Administrator for Courier Management System'
  },
  status: {
    type: Number,
    enum: [0, 1],
    default: 1
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('adminPassword')) {
    return next();
  }
  this.adminPassword = await bcrypt.hash(this.adminPassword, 10);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.adminPassword);
};

module.exports = mongoose.model('Admin', adminSchema); 