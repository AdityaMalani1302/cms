const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('../config/passport');
const Admin = require('../models/Admin');
const User = require('../models/User');

const router = express.Router();

// Generate JWT token
const generateToken = (id, userType) => {
  return jwt.sign(
    { id, userType },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// @route   POST /api/auth/admin/login
// @desc    Admin login
// @access  Public
router.post('/admin/login', [
  body('userName').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

    const { userName, password } = req.body;

    // Check if admin exists (using adminUsername field)
    const admin = await Admin.findOne({ adminUsername: userName });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(admin._id, 'admin');

    res.json({
      success: true,
      message: 'Login successful',
      token,
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
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Generate reset token (simplified for demo)
    const resetToken = jwt.sign(
      { id: user._id, userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In a real application, you would send this token via email
    // For demo purposes, we'll return it in the response
    res.json({
      success: true,
      message: 'Password reset token generated',
      resetToken // Remove this in production
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
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.pincode').notEmpty().withMessage('Pincode is required')
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

    const { name, email, password, phoneNumber, address } = req.body;

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
      address
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id, 'customer');

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
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

    // Generate token
    console.log('🎟️ Generating JWT token...');
    const token = generateToken(user._id, 'customer');
    console.log('✅ Login successful for user:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
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

// @route   GET /api/auth/google
// @desc    Redirect to Google OAuth
// @access  Public
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      // Generate JWT token for the authenticated user
      const token = generateToken(req.user._id, 'customer');
      
      // Prepare user data
      const user = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
        address: req.user.address,
        avatar: req.user.avatar,
        userType: 'customer',
        authProvider: req.user.authProvider
      };
      
      // Redirect to frontend with token and user data
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectURL = `${frontendURL}/auth/google/success?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`;
      
      res.redirect(redirectURL);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendURL}/auth/google/error?message=${encodeURIComponent('Authentication failed')}`);
    }
  }
);

// @route   POST /api/auth/google/verify
// @desc    Verify Google token from frontend
// @access  Public
router.post('/google/verify', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Verify the Google token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId });
    
    if (user) {
      // User exists, generate token and return
      const token = generateToken(user._id, 'customer');
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          address: user.address,
          avatar: user.avatar,
          userType: 'customer',
          authProvider: user.authProvider
        }
      });
    }
    
    // Check if user exists with the same email
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      // Link Google account to existing user
      existingUser.googleId = googleId;
      existingUser.avatar = picture;
      existingUser.authProvider = 'google';
      await existingUser.save();
      
      const token = generateToken(existingUser._id, 'customer');
      return res.json({
        success: true,
        message: 'Account linked successfully',
        token,
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          phoneNumber: existingUser.phoneNumber,
          address: existingUser.address,
          avatar: existingUser.avatar,
          userType: 'customer',
          authProvider: existingUser.authProvider
        }
      });
    }
    
    // Create new user
    const newUser = new User({
      googleId,
      name,
      email,
      avatar: picture,
      authProvider: 'google',
      // Default address fields - user can update these later
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      phoneNumber: '' // User will need to add this later
    });
    
    await newUser.save();
    
    const token = generateToken(newUser._id, 'customer');
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        address: newUser.address,
        avatar: newUser.avatar,
        userType: 'customer',
        authProvider: newUser.authProvider
      }
    });
  } catch (error) {
    console.error('Google token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
});

module.exports = router; 