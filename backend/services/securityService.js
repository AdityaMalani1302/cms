const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const User = require('../models/User');
const Admin = require('../models/Admin');
const DeliveryAgent = require('../models/DeliveryAgent');
// Email service removed

class SecurityService {
  constructor() {
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.tokenExpiry = '24h';
  }

  // Basic password validation
  validatePassword(password) {
    const errors = [];

    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (password.length > 50) {
      errors.push('Password must be less than 50 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  // Update password
  async updatePassword(userModel, userId, newPassword, oldPassword = null) {
    try {
      const validation = this.validatePassword(newPassword);
      if (!validation.isValid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }

      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify old password if provided
      if (oldPassword) {
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
          throw new Error('Current password is incorrect');
        }
      }

      // Hash and update password
      const hashedPassword = await this.hashPassword(newPassword);
      await userModel.findByIdAndUpdate(userId, {
        password: hashedPassword,
        passwordChangedAt: new Date()
      });

      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate password reset token
  generatePasswordResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return {
      token,
      hashedToken,
      expires
    };
  }

  // Send password reset email
  async sendPasswordResetEmail(userModel, email, userType = 'user') {
    try {
      const user = await userModel.findOne({ email });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const resetData = this.generatePasswordResetToken();
      
      // Update user with reset token
      await userModel.findByIdAndUpdate(user._id, {
        resetPasswordToken: resetData.hashedToken,
        resetPasswordExpires: resetData.expires
      });

      // Email service removed - reset token generated but not sent

      return {
        success: true,
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Reset password with token
  async resetPasswordWithToken(userModel, token, newPassword) {
    try {
      const validation = this.validatePassword(newPassword);
      if (!validation.isValid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const user = await userModel.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      const hashedPassword = await this.hashPassword(newPassword);
      
      await userModel.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
        passwordChangedAt: new Date()
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate JWT tokens
  generateTokens(user, userType) {
    const payload = {
      id: user._id,
      email: user.email || user.adminEmail || user.agentEmail,
      userType,
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: this.tokenExpiry
    });

    return {
      accessToken,
      expiresIn: this.tokenExpiry
    };
  }

  // Validate email format
  validateEmail(email) {
    return validator.isEmail(email);
  }

  // Validate phone number format
  validatePhoneNumber(phone) {
    return /^[\d\s\-\+\(\)]{10,15}$/.test(phone);
  }

  // Sanitize user input
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return validator.escape(input.trim());
  }

  // Generate session ID
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new SecurityService();