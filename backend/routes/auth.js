const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('../config/passport');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { validate, validationRules } = require('../middleware/validation');
// Rate limiting imports removed
const { sessionManager, logoutUser } = require('../middleware/sessionManager');
const logger = require('../utils/logger');

const router = express.Router();

// Enhanced token generation with session management
const generateTokens = (userId, userType, deviceInfo = {}) => {
  // Create session
  const { sessionId, refreshToken } = sessionManager.createSession(userId, userType, deviceInfo);
  
  // Generate access token with session ID
  const accessToken = sessionManager.generateAccessToken(userId, userType, sessionId);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  };
};

// Legacy function for backward compatibility
const generateToken = (id, userType) => {
  const tokens = generateTokens(id, userType);
  return tokens.accessToken;
};

// Parse device info from request
const parseDeviceInfo = (req) => {
  const userAgent = req.get('User-Agent') || 'Unknown';
  return {
    userAgent,
    ip: req.ip,
    browser: userAgent.includes('Chrome') ? 'Chrome' : 
             userAgent.includes('Firefox') ? 'Firefox' :
             userAgent.includes('Safari') ? 'Safari' : 'Unknown',
    os: userAgent.includes('Windows') ? 'Windows' :
        userAgent.includes('Mac') ? 'macOS' :
        userAgent.includes('Linux') ? 'Linux' :
        userAgent.includes('Android') ? 'Android' :
        userAgent.includes('iOS') ? 'iOS' : 'Unknown'
  };
};

// @route   POST /api/auth/admin/login
// @desc    Admin login
// @access  Public
router.post('/admin/login', [
  ...validationRules.adminLogin,
  validate
], async (req, res) => {
  try {
    console.log('👉 Admin login attempt:', { userName: req.body.userName });
    const { userName, password } = req.body;
    const clientIP = req.ip;

    // Rate limiting checks removed

    // Check if admin exists (using adminUsername field)
    console.log('🔍 Looking for admin with username:', userName);
    const admin = await Admin.findOne({ adminUsername: userName });
    if (!admin) {
      console.log('❌ Admin not found');
      
      // Log failed login attempt
      logger.warn('Admin login failed - user not found', {
        username: userName,
        ip: clientIP,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    console.log('✅ Admin found:', { id: admin._id, username: admin.adminUsername });

    // Check password
    console.log('🔐 Checking password...');
    const isPasswordValid = await admin.comparePassword(password);
    console.log('🔑 Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Password does not match');
      
      // Log failed login attempt
      logger.warn('Admin login failed - invalid password', {
        username: userName,
        ip: clientIP,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Rate limiting clearing removed

    // Log successful login
    logger.success('Admin login successful', {
      id: admin._id.toString(),
      username: userName,
      ip: clientIP,
      userAgent: req.get('User-Agent')
    });

    // Generate tokens with session management
    const deviceInfo = parseDeviceInfo(req);
    const tokens = generateTokens(admin._id, 'admin', deviceInfo);

    res.json({
      success: true,
      message: 'Login successful',
      token: tokens.accessToken, // For backward compatibility
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: admin._id,
        adminName: admin.adminName,
        userName: admin.adminUsername,
        email: admin.adminEmail,
        userType: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('userType').isIn(['admin']).withMessage('Valid user type is required')
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

    let user;
    if (userType === 'admin') {
      user = await Admin.findOne({ adminEmail: email });
    }

    if (!user) {
      // SECURITY FIX: Don't reveal whether user exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token (simplified for demo)
    const resetToken = jwt.sign(
      { id: user._id, userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Send reset token via email instead of returning it
    // SECURITY FIX: Don't expose reset token in response
    res.json({
      success: true,
      message: 'Password reset link has been sent to your email address.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Customer registration
// @access  Public
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('securityQuestions').optional().isArray({ min: 3, max: 3 }).withMessage('Exactly 3 security questions are required'),
  body('securityQuestions.*.question').optional().notEmpty().withMessage('Security question cannot be empty'),
  body('securityQuestions.*.answer').optional().notEmpty().withMessage('Security answer cannot be empty')
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

    const { name, email, password, phoneNumber, address, securityQuestions } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phoneNumber,
      address,
      securityQuestions: securityQuestions || []
    });

    await user.save();

    // Generate tokens with session management
    const deviceInfo = parseDeviceInfo(req);
    const tokens = generateTokens(user._id, 'customer', deviceInfo);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: tokens.accessToken, // For backward compatibility
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        userType: 'customer'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Customer login
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    console.log('🔐 Customer login attempt:', { email: req.body.email, timestamp: new Date() });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    console.log('👤 Looking for user with email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ User found:', { id: user._id, email: user.email, isActive: user.isActive });

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User account is deactivated');
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    console.log('🔑 Checking password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Password does not match');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens with session management
    console.log('🎟️ Generating JWT tokens...');
    const deviceInfo = parseDeviceInfo(req);
    const tokens = generateTokens(user._id, 'customer', deviceInfo);
    console.log('✅ Login successful for user:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token: tokens.accessToken, // For backward compatibility
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        userType: 'customer'
      }
    });
  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/auth/user
// @desc    Get current user
// @access  Private
router.get('/user', require('../middleware/auth').authenticateUser, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
        address: req.user.address,
        userType: 'customer'
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
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
    
    // Decode refresh token to get user info
    const jwt = require('jsonwebtoken');
    let userInfo;
    try {
      userInfo = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Refresh session
    const tokens = await sessionManager.refreshSession(refreshToken);
    
    // Fetch user data based on userType
    let userData = null;
    try {
      if (userInfo.userType === 'admin') {
        const Admin = require('../models/Admin');
        const admin = await Admin.findById(userInfo.id).select('-password');
        if (admin) {
          userData = {
            id: admin._id,
            adminName: admin.adminName,
            userName: admin.adminUsername,
            email: admin.adminEmail,
            userType: 'admin'
          };
        }
      } else if (userInfo.userType === 'customer') {
        const User = require('../models/User');
        const user = await User.findById(userInfo.id).select('-password');
        if (user) {
          userData = {
            id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            address: user.address,
            userType: 'customer'
          };
        }
      } else if (userInfo.userType === 'deliveryAgent') {
        const DeliveryAgent = require('../models/DeliveryAgent');
        const agent = await DeliveryAgent.findById(userInfo.id).select('-password');
        if (agent) {
          userData = {
            id: agent._id,
            agentId: agent.agentId,
            name: agent.name,
            email: agent.email,
            assignedBranch: agent.assignedBranch,
            vehicleType: agent.vehicleType,
            isAvailable: agent.isAvailable,
            userType: 'deliveryAgent'
          };
        }
      }
    } catch (dbError) {
      logger.warn('Failed to fetch user data during refresh:', {
        error: dbError.message,
        userId: userInfo.id,
        userType: userInfo.userType
      });
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: userData
    });
  } catch (error) {
    logger.warn('Token refresh failed:', {
      error: error.message,
      ip: req.ip
    });

    res.status(401).json({
      success: false,
      message: error.message || 'Failed to refresh token'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and invalidate session
// @access  Private
router.post('/logout', require('../middleware/auth').authAny, async (req, res) => {
  try {
    if (req.session?.sessionId) {
      // Invalidate current session
      sessionManager.removeSession(req.session.sessionId);
      
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// @route   POST /api/auth/logout-all
// @desc    Logout from all sessions
// @access  Private
router.post('/logout-all', require('../middleware/auth').authAny, async (req, res) => {
  try {
    const invalidatedCount = sessionManager.invalidateUserSessions(
      req.userId,
      req.userType
    );


    res.json({
      success: true,
      message: `Logged out from ${invalidatedCount} sessions`
    });
  } catch (error) {
    logger.error('Logout all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout from all sessions'
    });
  }
});

// @route   GET /api/auth/sessions
// @desc    Get user's active sessions
// @access  Private
router.get('/sessions', require('../middleware/auth').authAny, async (req, res) => {
  try {
    const sessions = sessionManager.getUserSessions(req.userId, req.userType);
    
    // Mark current session
    const currentSessionId = req.session?.sessionId;
    sessions.forEach(session => {
      session.isCurrent = session.sessionId === currentSessionId;
    });

    res.json({
      success: true,
      data: {
        sessions,
        total: sessions.length
      }
    });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sessions'
    });
  }
});

// @route   DELETE /api/auth/sessions/:sessionId
// @desc    Terminate specific session
// @access  Private
router.delete('/sessions/:sessionId', require('../middleware/auth').authAny, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify session belongs to user
    const userSessions = sessionManager.getUserSessions(req.userId, req.userType);
    const sessionExists = userSessions.some(s => s.sessionId === sessionId);
    
    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const success = sessionManager.invalidateSession(sessionId, 'USER_TERMINATED');

    if (success) {
      res.json({
        success: true,
        message: 'Session terminated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Session not found or already terminated'
      });
    }
  } catch (error) {
    logger.error('Terminate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate session'
    });
  }
});

// @route   GET /api/auth/session-info
// @desc    Get current session information
// @access  Private
router.get('/session-info', require('../middleware/auth').authAny, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        success: false,
        message: 'No active session'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: req.session.sessionId,
        createdAt: req.session.createdAt,
        lastActivity: req.session.lastActivity,
        deviceInfo: req.session.deviceInfo,
        userType: req.session.userType
      }
    });
  } catch (error) {
    logger.error('Get session info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session information'
    });
  }
});

// ===== PASSWORD RECOVERY ROUTES FOR ACADEMIC PROJECT =====

// @route   GET /api/auth/security-questions/:email
// @desc    Get user's security questions (for password recovery)
// @access  Public
router.get('/security-questions/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ email }).select('securityQuestions.question');
    if (!user || !user.securityQuestions || user.securityQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No security questions found for this email address'
      });
    }

    // Return only the questions, not the answers
    const questions = user.securityQuestions.map((sq, index) => ({
      index,
      question: sq.question
    }));

    res.json({
      success: true,
      data: { questions }
    });
  } catch (error) {
    console.error('Get security questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/forgot-password-user
// @desc    Initiate user password reset with security questions
// @access  Public
router.post('/forgot-password-user', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, security questions will be available for password reset'
      });
    }

    // Check if user has security questions set up
    if (!user.securityQuestions || user.securityQuestions.length === 0) {
      return res.json({
        success: true,
        message: 'Account recovery requires contacting support'
      });
    }

    res.json({
      success: true,
      message: 'Security questions available for password reset',
      hasSecurityQuestions: true
    });
  } catch (error) {
    console.error('User forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/verify-security-questions
// @desc    Verify security questions and generate reset token
// @access  Public
router.post('/verify-security-questions', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('answers').isArray({ min: 1 }).withMessage('At least one answer is required'),
  body('answers.*.questionIndex').isInt({ min: 0 }).withMessage('Valid question index is required'),
  body('answers.*.answer').notEmpty().withMessage('Answer cannot be empty')
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

    const { email, answers } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.securityQuestions || user.securityQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Rate limiting check
    if (user.passwordResetAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many password reset attempts. Please try again later.'
      });
    }

    // Verify all provided answers
    let allCorrect = true;
    for (const answer of answers) {
      const isCorrect = await user.compareSecurityAnswer(answer.questionIndex, answer.answer);
      if (!isCorrect) {
        allCorrect = false;
        break;
      }
    }

    if (!allCorrect) {
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'Incorrect security answers. Please try again.'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    res.json({
      success: true,
      message: 'Security questions verified successfully',
      resetToken // In production, this should be sent via email
    });
  } catch (error) {
    console.error('Verify security questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/reset-password-user
// @desc    Reset user password using verified token
// @access  Public
router.post('/reset-password-user', [
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

    const { resetToken, newPassword } = req.body;
    
    // Hash the reset token to match stored version
    const hashedToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.passwordResetAttempts = 0;
    user.lastPasswordReset = new Date();
    
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/admin-recovery
// @desc    Admin password recovery using master key
// @access  Public
router.post('/admin-recovery', [
  body('masterKey').notEmpty().withMessage('Master recovery key is required'),
  body('adminUsername').notEmpty().withMessage('Admin username is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
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

    const { masterKey, adminUsername, newPassword } = req.body;
    
    // Verify master recovery key
    const expectedMasterKey = process.env.ADMIN_MASTER_RECOVERY_KEY || 'academic-demo-key-2024';
    if (masterKey !== expectedMasterKey) {
      // Log suspicious activity
      logger.security('Invalid master recovery key attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        username: adminUsername
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid master recovery key'
      });
    }

    // Find admin user
    const admin = await Admin.findOne({ adminUsername });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Update admin password
    admin.adminPassword = newPassword;
    admin.lastPasswordReset = new Date();
    admin.masterRecoveryUsed = new Date();
    admin.passwordResetAttempts = 0;
    
    await admin.save();

    // Log successful recovery
    logger.security('Admin password recovered using master key', {
      adminId: admin._id,
      username: admin.adminUsername,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Admin password reset successfully using master recovery key'
    });
  } catch (error) {
    console.error('Admin recovery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 