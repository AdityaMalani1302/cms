const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { validatePasswordComplexity } = require('../utils/passwordValidation');
// const { encryptionPlugin } = require('../utils/encryption');

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
    lowercase: true,
    validate: {
      validator: function(email) {
        return validator.isEmail(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password is required only if not a Google user
    },
    minlength: 6,
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
  clerkId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values but ensures uniqueness for non-null values
  },
  avatar: {
    type: String // Store profile picture URL
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'clerk'],
    default: 'local'
  },
  phoneNumber: {
    type: String,
    required: function() {
      return !this.googleId && !this.clerkId; // Phone number is required only if not a Google or Clerk user
    },
    trim: true
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'India'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Security questions for password recovery
  securityQuestions: [{
    question: {
      type: String,
      required: function() {
        return !this.googleId && !this.clerkId; // Required only for local accounts
      }
    },
    answer: {
      type: String,
      required: function() {
        return !this.googleId && !this.clerkId; // Required only for local accounts
      }
    }
  }],
  // Password reset fields
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  passwordResetAttempts: {
    type: Number,
    default: 0
  },
  lastPasswordReset: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Skip password hashing for Google/Clerk users or if password is not modified
  if (!this.isModified('password') || this.googleId || this.clerkId) return next();
  
  try {
    const salt = await bcrypt.genSalt(12); // SECURITY FIX: Increase salt rounds
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

// Hash security question answers
userSchema.pre('save', async function(next) {
  if (!this.isModified('securityQuestions')) return next();
  
  try {
    // Hash security question answers
    if (this.securityQuestions && this.securityQuestions.length > 0) {
      for (let i = 0; i < this.securityQuestions.length; i++) {
        if (this.securityQuestions[i].answer && !this.securityQuestions[i].answer.startsWith('$2b$')) {
          const salt = await bcrypt.genSalt(10);
          this.securityQuestions[i].answer = await bcrypt.hash(
            this.securityQuestions[i].answer.toLowerCase().trim(), 
            salt
          );
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Compare security question answer
userSchema.methods.compareSecurityAnswer = async function(questionIndex, candidateAnswer) {
  if (!this.securityQuestions || !this.securityQuestions[questionIndex]) {
    return false;
  }
  
  const normalizedAnswer = candidateAnswer.toLowerCase().trim();
  return await bcrypt.compare(normalizedAnswer, this.securityQuestions[questionIndex].answer);
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  this.passwordResetToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  this.passwordResetAttempts = (this.passwordResetAttempts || 0) + 1;
  
  return resetToken;
};

// Apply encryption plugin for sensitive fields
// userSchema.plugin(encryptionPlugin, {
//   encryptedFields: ['phoneNumber'], // Encrypt phone numbers
//   hashFields: [] // Password is already handled separately
// });

module.exports = mongoose.model('User', userSchema); 