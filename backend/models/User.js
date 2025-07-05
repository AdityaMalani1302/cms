const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { validatePasswordComplexity } = require('../utils/passwordValidation');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password is required only if not a Google user
    },
    minlength: 8,
    validate: {
      validator: function(password) {
        if (!password && this.googleId) return true; // Skip validation for Google users
        const validation = validatePasswordComplexity(password);
        return validation.isValid;
      },
      message: function(props) {
        const validation = validatePasswordComplexity(props.value);
        return validation.errors.join(', ');
      }
    }
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values but ensures uniqueness for non-null values
  },
  avatar: {
    type: String // Store Google profile picture URL
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Skip password hashing for Google users or if password is not modified
  if (!this.isModified('password') || this.googleId) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 