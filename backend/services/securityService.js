const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const validator = require('validator');

const User = require('../models/User');
const Admin = require('../models/Admin');
const DeliveryAgent = require('../models/DeliveryAgent');
const emailService = require('./emailService');
const smsService = require('./smsService');

class SecurityService {
  constructor() {
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 30 * 60 * 1000; // 30 minutes
    this.passwordHistoryLimit = 5;
    this.tokenExpiry = '7d';
    this.refreshTokenExpiry = '30d';
    this.otpExpiry = 10 * 60 * 1000; // 10 minutes
  }

  // Enhanced password validation
  validatePassword(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain more than 2 consecutive identical characters');
    }

    // Check for common passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a more secure password');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  // Calculate password strength score
  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[@$!%*?&]/.test(password)) score += 1;

    // Patterns (negative points)
    if (/(.)\1{2,}/.test(password)) score -= 1;
    if (/123|abc|qwe/i.test(password)) score -= 1;

    const strength = Math.max(0, Math.min(10, score));
    
    if (strength <= 3) return { score: strength, level: 'Weak' };
    if (strength <= 6) return { score: strength, level: 'Medium' };
    if (strength <= 8) return { score: strength, level: 'Strong' };
    return { score: strength, level: 'Very Strong' };
  }

  // Hash password with salt
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Check password history
  async checkPasswordHistory(userModel, userId, newPassword) {
    try {
      const user = await userModel.findById(userId);
      if (!user || !user.passwordHistory) return true;

      // Check against previous passwords
      for (const historicalPassword of user.passwordHistory) {
        const isMatch = await bcrypt.compare(newPassword, historicalPassword.hash);
        if (isMatch) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Password history check error:', error);
      return true; // Allow if check fails
    }
  }

  // Update password with history tracking
  async updatePasswordWithHistory(userModel, userId, newPassword, oldPassword = null) {
    try {
      // Validate new password
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

      // Check password history
      const isPasswordUnique = await this.checkPasswordHistory(userModel, userId, newPassword);
      if (!isPasswordUnique) {
        throw new Error(`Password has been used recently. Please choose a different password.`);
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password history
      const passwordHistory = user.passwordHistory || [];
      passwordHistory.unshift({
        hash: user.password,
        changedAt: new Date()
      });

      // Keep only last N passwords
      if (passwordHistory.length > this.passwordHistoryLimit) {
        passwordHistory.splice(this.passwordHistoryLimit);
      }

      // Update user
      await userModel.findByIdAndUpdate(userId, {
        password: hashedPassword,
        passwordHistory,
        passwordChangedAt: new Date(),
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }
      });

      return {
        success: true,
        message: 'Password updated successfully',
        strength: validation.strength
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
        throw new Error('No user found with this email address');
      }

      const { token, hashedToken, expires } = this.generatePasswordResetToken();

      // Save reset token to user
      await userModel.findByIdAndUpdate(user._id, {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expires
      });

      // Send email
      const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}&type=${userType}`;
      
      await emailService.sendEmail({
        to: email,
        subject: 'Password Reset Request - CMS',
        template: 'password-reset',
        data: {
          name: user.name || user.agentName || user.adminName,
          resetURL,
          expiryTime: '1 hour'
        }
      });

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
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await userModel.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Password reset token is invalid or has expired');
      }

      // Update password
      const result = await this.updatePasswordWithHistory(userModel, user._id, newPassword);

      // Clear reset token
      await userModel.findByIdAndUpdate(user._id, {
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Multi-Factor Authentication (MFA) Setup
  generateMFASecret(email) {
    const secret = speakeasy.generateSecret({
      name: `CMS (${email})`,
      issuer: 'Courier Management System'
    });

    return {
      secret: secret.base32,
      qrCodeURL: secret.otpauth_url,
      manualEntryKey: secret.base32
    };
  }

  // Verify MFA token
  verifyMFAToken(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time windows (60 seconds)
    });
  }

  // Enable MFA for user
  async enableMFA(userModel, userId, token) {
    try {
      const user = await userModel.findById(userId);
      if (!user || !user.mfaSecret) {
        throw new Error('MFA setup not initiated');
      }

      // Verify token
      const isValid = this.verifyMFAToken(user.mfaSecret, token);
      if (!isValid) {
        throw new Error('Invalid MFA token');
      }

      // Enable MFA
      await userModel.findByIdAndUpdate(userId, {
        mfaEnabled: true,
        mfaBackupCodes: this.generateBackupCodes()
      });

      return {
        success: true,
        message: 'MFA enabled successfully',
        backupCodes: user.mfaBackupCodes
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate backup codes for MFA
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // SMS-based 2FA
  async sendSMSOTP(phoneNumber, userType = 'user') {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
      const expires = new Date(Date.now() + this.otpExpiry);

      // Store OTP temporarily (you might want to use Redis for this)
      const otpData = {
        hashedOTP,
        expires,
        phoneNumber,
        userType,
        attempts: 0
      };

      // In a real implementation, store this in Redis or temporary collection
      // For now, we'll store it in memory (not recommended for production)
      global.otpStore = global.otpStore || {};
      global.otpStore[phoneNumber] = otpData;

      // Send SMS
      await smsService.sendSMS(phoneNumber, `Your CMS verification code is: ${otp}. Valid for 10 minutes.`);

      return {
        success: true,
        message: 'OTP sent successfully',
        expiresIn: this.otpExpiry
      };
    } catch (error) {
      throw error;
    }
  }

  // Verify SMS OTP
  async verifySMSOTP(phoneNumber, otp) {
    try {
      const otpData = global.otpStore?.[phoneNumber];
      if (!otpData) {
        throw new Error('OTP not found or expired');
      }

      if (otpData.expires < new Date()) {
        delete global.otpStore[phoneNumber];
        throw new Error('OTP has expired');
      }

      if (otpData.attempts >= 3) {
        delete global.otpStore[phoneNumber];
        throw new Error('Maximum OTP attempts exceeded');
      }

      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
      if (hashedOTP !== otpData.hashedOTP) {
        otpData.attempts++;
        throw new Error('Invalid OTP');
      }

      // OTP verified successfully
      delete global.otpStore[phoneNumber];
      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Enhanced JWT token generation
  generateTokens(user, userType) {
    const payload = {
      id: user._id,
      type: userType,
      email: user.email,
      name: user.name || user.agentName || user.adminName
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: this.tokenExpiry,
      issuer: 'cms-system',
      audience: userType
    });

    const refreshToken = jwt.sign(
      { id: user._id, type: userType },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'cms-system',
        audience: 'refresh'
      }
    );

    return { accessToken, refreshToken };
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );

      if (decoded.aud !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Get user based on type
      let user;
      let userModel;
      switch (decoded.type) {
        case 'admin':
          userModel = Admin;
          break;
        case 'deliveryAgent':
          userModel = DeliveryAgent;
          break;
        default:
          userModel = User;
      }

      user = await userModel.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user, decoded.type);

      return {
        success: true,
        tokens
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Track login activity
  async trackLoginActivity(userModel, userId, request) {
    try {
      const loginData = {
        timestamp: new Date(),
        ipAddress: request.ip || request.connection.remoteAddress,
        userAgent: request.headers['user-agent'],
        success: true
      };

      await userModel.findByIdAndUpdate(userId, {
        $push: {
          loginHistory: {
            $each: [loginData],
            $slice: -50 // Keep last 50 login records
          }
        },
        lastLogin: new Date()
      });
    } catch (error) {
      console.error('Login tracking error:', error);
    }
  }

  // Track failed login attempts
  async trackFailedLogin(userModel, identifier, request) {
    try {
      const update = {
        $inc: { loginAttempts: 1 },
        $push: {
          loginHistory: {
            $each: [{
              timestamp: new Date(),
              ipAddress: request.ip || request.connection.remoteAddress,
              userAgent: request.headers['user-agent'],
              success: false
            }],
            $slice: -50
          }
        }
      };

      const user = await userModel.findOneAndUpdate(
        { $or: [{ email: identifier }, { agentId: identifier }] },
        update,
        { new: true }
      );

      if (user && user.loginAttempts >= this.maxLoginAttempts) {
        await userModel.findByIdAndUpdate(user._id, {
          lockUntil: new Date(Date.now() + this.lockoutDuration)
        });
      }

      return user;
    } catch (error) {
      console.error('Failed login tracking error:', error);
    }
  }

  // Check if account is locked
  async isAccountLocked(userModel, identifier) {
    try {
      const user = await userModel.findOne({
        $or: [{ email: identifier }, { agentId: identifier }],
        lockUntil: { $gt: new Date() }
      });

      return !!user;
    } catch (error) {
      console.error('Account lock check error:', error);
      return false;
    }
  }

  // Reset login attempts
  async resetLoginAttempts(userModel, userId) {
    try {
      await userModel.findByIdAndUpdate(userId, {
        $unset: { loginAttempts: 1, lockUntil: 1 }
      });
    } catch (error) {
      console.error('Reset login attempts error:', error);
    }
  }

  // Input sanitization
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return validator.escape(input.trim());
  }

  // Rate limiting helper
  createRateLimitKey(req, suffix = '') {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    return `rate_limit:${ip}:${userAgent}:${suffix}`;
  }

  // Generate secure session ID
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validate email format
  validateEmail(email) {
    return validator.isEmail(email);
  }

  // Validate phone number format
  validatePhoneNumber(phone) {
    return validator.isMobilePhone(phone, 'any');
  }

  // Password strength meter for frontend
  getPasswordStrengthMeter(password) {
    const validation = this.validatePassword(password);
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      strength: validation.strength,
      suggestions: this.getPasswordSuggestions(password)
    };
  }

  // Get password improvement suggestions
  getPasswordSuggestions(password) {
    const suggestions = [];

    if (password.length < 12) {
      suggestions.push('Use at least 12 characters for better security');
    }

    if (!/[A-Z]/.test(password)) {
      suggestions.push('Add uppercase letters');
    }

    if (!/[a-z]/.test(password)) {
      suggestions.push('Add lowercase letters');
    }

    if (!/\d/.test(password)) {
      suggestions.push('Add numbers');
    }

    if (!/[@$!%*?&]/.test(password)) {
      suggestions.push('Add special characters');
    }

    if (/(.)\1{2,}/.test(password)) {
      suggestions.push('Avoid repeating characters');
    }

    if (suggestions.length === 0) {
      suggestions.push('Great password! Consider making it even longer for maximum security.');
    }

    return suggestions;
  }
}

// Create singleton instance
const securityService = new SecurityService();

module.exports = securityService;