const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { auth, authAdmin } = require('../middleware/auth');

const securityService = require('../services/securityService');
const User = require('../models/User');
const Admin = require('../models/Admin');
const DeliveryAgent = require('../models/DeliveryAgent');

const router = express.Router();

// Rate limiting for sensitive endpoints
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: 'Rate limit exceeded, please try again later.'
  }
});

// FEATURE 2.3: ENHANCED AUTHENTICATION & SECURITY

// Password strength checker
router.post('/password/check-strength', [
  generalRateLimit,
  body('password').isLength({ min: 1 }).withMessage('Password is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { password } = req.body;
    const strengthMeter = securityService.getPasswordStrengthMeter(password);

    res.json({
      success: true,
      data: strengthMeter
    });
  } catch (error) {
    console.error('Password strength check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check password strength'
    });
  }
});

// Change password (authenticated users)
router.put('/password/change', [
  auth,
  generalRateLimit,
  body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const { userType, userId } = req.user;

    // Determine user model
    let userModel;
    switch (userType) {
      case 'admin':
        userModel = Admin;
        break;
      case 'deliveryAgent':
        userModel = DeliveryAgent;
        break;
      default:
        userModel = User;
    }

    const result = await securityService.updatePasswordWithHistory(
      userModel,
      userId,
      newPassword,
      currentPassword
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        strength: result.strength
      }
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Forgot password - send reset email
router.post('/password/forgot', [
  strictRateLimit,
  body('email').isEmail().withMessage('Valid email is required'),
  body('userType').isIn(['user', 'admin', 'deliveryAgent']).withMessage('Valid user type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, userType } = req.body;

    // Determine user model
    let userModel;
    switch (userType) {
      case 'admin':
        userModel = Admin;
        break;
      case 'deliveryAgent':
        userModel = DeliveryAgent;
        break;
      default:
        userModel = User;
    }

    await securityService.sendPasswordResetEmail(userModel, email, userType);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  }
});

// Reset password with token
router.post('/password/reset', [
  strictRateLimit,
  body('token').isLength({ min: 1 }).withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  }),
  body('userType').isIn(['user', 'admin', 'deliveryAgent']).withMessage('Valid user type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, newPassword, userType } = req.body;

    // Determine user model
    let userModel;
    switch (userType) {
      case 'admin':
        userModel = Admin;
        break;
      case 'deliveryAgent':
        userModel = DeliveryAgent;
        break;
      default:
        userModel = User;
    }

    const result = await securityService.resetPasswordWithToken(userModel, token, newPassword);

    res.json({
      success: true,
      message: result.message,
      data: {
        strength: result.strength
      }
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Multi-Factor Authentication Setup
router.post('/mfa/setup', [
  auth,
  generalRateLimit
], async (req, res) => {
  try {
    const { userType, userId } = req.user;

    // Determine user model
    let userModel;
    switch (userType) {
      case 'admin':
        userModel = Admin;
        break;
      case 'deliveryAgent':
        userModel = DeliveryAgent;
        break;
      default:
        userModel = User;
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const mfaSetup = securityService.generateMFASecret(user.email);

    // Save MFA secret to user (temporarily)
    await userModel.findByIdAndUpdate(userId, {
      mfaSecret: mfaSetup.secret
    });

    res.json({
      success: true,
      message: 'MFA setup initiated',
      data: {
        qrCodeURL: mfaSetup.qrCodeURL,
        manualEntryKey: mfaSetup.manualEntryKey
      }
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup MFA'
    });
  }
});

// Enable MFA
router.post('/mfa/enable', [
  auth,
  strictRateLimit,
  body('token').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token } = req.body;
    const { userType, userId } = req.user;

    // Determine user model
    let userModel;
    switch (userType) {
      case 'admin':
        userModel = Admin;
        break;
      case 'deliveryAgent':
        userModel = DeliveryAgent;
        break;
      default:
        userModel = User;
    }

    const result = await securityService.enableMFA(userModel, userId, token);

    res.json({
      success: true,
      message: result.message,
      data: {
        backupCodes: result.backupCodes
      }
    });
  } catch (error) {
    console.error('MFA enable error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Disable MFA
router.post('/mfa/disable', [
  auth,
  strictRateLimit,
  body('token').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token } = req.body;
    const { userType, userId } = req.user;

    // Determine user model
    let userModel;
    switch (userType) {
      case 'admin':
        userModel = Admin;
        break;
      case 'deliveryAgent':
        userModel = DeliveryAgent;
        break;
      default:
        userModel = User;
    }

    const user = await userModel.findById(userId);
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is not enabled'
      });
    }

    // Verify token
    const isValid = securityService.verifyMFAToken(user.mfaSecret, token);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MFA token'
      });
    }

    // Disable MFA
    await userModel.findByIdAndUpdate(userId, {
      mfaEnabled: false,
      $unset: { mfaSecret: 1, mfaBackupCodes: 1 }
    });

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable MFA'
    });
  }
});

// SMS-based 2FA - Send OTP
router.post('/2fa/sms/send', [
  strictRateLimit,
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('userType').isIn(['user', 'admin', 'deliveryAgent']).withMessage('Valid user type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phoneNumber, userType } = req.body;

    const result = await securityService.sendSMSOTP(phoneNumber, userType);

    res.json({
      success: true,
      message: result.message,
      data: {
        expiresIn: result.expiresIn
      }
    });
  } catch (error) {
    console.error('SMS OTP send error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

// SMS-based 2FA - Verify OTP
router.post('/2fa/sms/verify', [
  strictRateLimit,
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phoneNumber, otp } = req.body;

    const result = await securityService.verifySMSOTP(phoneNumber, otp);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('SMS OTP verify error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Refresh access token
router.post('/token/refresh', [
  generalRateLimit,
  body('refreshToken').isLength({ min: 1 }).withMessage('Refresh token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { refreshToken } = req.body;

    const result = await securityService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result.tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// Get user security settings
router.get('/settings', [auth], async (req, res) => {
  try {
    const { userType, userId } = req.user;

    // Determine user model
    let userModel;
    switch (userType) {
      case 'admin':
        userModel = Admin;
        break;
      case 'deliveryAgent':
        userModel = DeliveryAgent;
        break;
      default:
        userModel = User;
    }

    const user = await userModel.findById(userId)
      .select('email mfaEnabled passwordChangedAt loginHistory lastLogin')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get recent login history (last 10)
    const recentLogins = user.loginHistory 
      ? user.loginHistory.slice(-10).reverse()
      : [];

    res.json({
      success: true,
      data: {
        email: user.email,
        mfaEnabled: user.mfaEnabled || false,
        passwordChangedAt: user.passwordChangedAt,
        lastLogin: user.lastLogin,
        recentLogins
      }
    });
  } catch (error) {
    console.error('Security settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security settings'
    });
  }
});

// Get active sessions (simplified - in production, you'd use Redis or similar)
router.get('/sessions', [auth], async (req, res) => {
  try {
    const { userType, userId } = req.user;

    // Determine user model
    let userModel;
    switch (userType) {
      case 'admin':
        userModel = Admin;
        break;
      case 'deliveryAgent':
        userModel = DeliveryAgent;
        break;
      default:
        userModel = User;
    }

    const user = await userModel.findById(userId)
      .select('loginHistory')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Group login history by IP and User Agent to simulate sessions
    const sessions = {};
    const recentLogins = user.loginHistory || [];

    recentLogins.forEach(login => {
      if (login.success) {
        const sessionKey = `${login.ipAddress}_${login.userAgent}`;
        if (!sessions[sessionKey] || sessions[sessionKey].lastActivity < login.timestamp) {
          sessions[sessionKey] = {
            ipAddress: login.ipAddress,
            userAgent: login.userAgent,
            lastActivity: login.timestamp,
            isCurrentSession: false // Would be determined by comparing with current request
          };
        }
      }
    });

    // Mark current session
    const currentIP = req.ip || req.connection.remoteAddress;
    const currentUA = req.headers['user-agent'];
    const currentSessionKey = `${currentIP}_${currentUA}`;
    if (sessions[currentSessionKey]) {
      sessions[currentSessionKey].isCurrentSession = true;
    }

    res.json({
      success: true,
      data: {
        sessions: Object.values(sessions).slice(-5) // Last 5 sessions
      }
    });
  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active sessions'
    });
  }
});

// Logout from all devices (invalidate all tokens)
router.post('/logout-all', [auth, strictRateLimit], async (req, res) => {
  try {
    const { userType, userId } = req.user;

    // Determine user model
    let userModel;
    switch (userType) {
      case 'admin':
        userModel = Admin;
        break;
      case 'deliveryAgent':
        userModel = DeliveryAgent;
        break;
      default:
        userModel = User;
    }

    // In a real implementation, you would:
    // 1. Add current token to blacklist
    // 2. Increment user's token version to invalidate all existing tokens
    // 3. Clear all sessions from Redis/session store

    await userModel.findByIdAndUpdate(userId, {
      tokenVersion: Date.now(), // Simple versioning - increment this to invalidate all tokens
      $push: {
        loginHistory: {
          timestamp: new Date(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          action: 'logout_all_devices',
          success: true
        }
      }
    });

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout from all devices'
    });
  }
});

// Admin-only: Security audit endpoint
router.get('/audit', [authAdmin], async (req, res) => {
  try {
    const { timeRange = '30' } = req.query; // days
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get security metrics across all user types
    const [userMetrics, adminMetrics, agentMetrics] = await Promise.all([
      User.aggregate([
        {
          $match: {
            $or: [
              { lastLogin: { $gte: startDate } },
              { createdAt: { $gte: startDate } }
            ]
          }
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [{ $gte: ['$lastLogin', startDate] }, 1, 0]
              }
            },
            mfaEnabledUsers: {
              $sum: {
                $cond: [{ $eq: ['$mfaEnabled', true] }, 1, 0]
              }
            },
            lockedAccounts: {
              $sum: {
                $cond: [{ $gt: ['$lockUntil', new Date()] }, 1, 0]
              }
            }
          }
        }
      ]),
      Admin.aggregate([
        {
          $group: {
            _id: null,
            totalAdmins: { $sum: 1 },
            mfaEnabledAdmins: {
              $sum: {
                $cond: [{ $eq: ['$mfaEnabled', true] }, 1, 0]
              }
            }
          }
        }
      ]),
      DeliveryAgent.aggregate([
        {
          $group: {
            _id: null,
            totalAgents: { $sum: 1 },
            activeAgents: {
              $sum: {
                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
              }
            },
            mfaEnabledAgents: {
              $sum: {
                $cond: [{ $eq: ['$mfaEnabled', true] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);

    const auditData = {
      users: userMetrics[0] || {},
      admins: adminMetrics[0] || {},
      agents: agentMetrics[0] || {},
      timeRange: `${timeRange} days`,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: auditData
    });
  } catch (error) {
    console.error('Security audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate security audit'
    });
  }
});

module.exports = router;