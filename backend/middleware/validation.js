// Validation middleware for college project
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Main validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
};

// Common validation rules
const validationRules = {
  // User registration validation
  userRegistration: [
    body('customerName').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('customerEmail').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6, max: 12 }).withMessage('Password must be between 6-12 characters'),
    body('customerPhone').isMobilePhone().withMessage('Valid phone number required')
  ],

  // User login validation
  userLogin: [
    body('customerEmail').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required')
  ],

  // Courier booking validation
  courierBooking: [
    body('pickupAddress.street').notEmpty().withMessage('Pickup street address required'),
    body('pickupAddress.city').notEmpty().withMessage('Pickup city required'),
    body('pickupAddress.pincode').isLength({ min: 6, max: 6 }).withMessage('Valid PIN code required'),
    body('deliveryAddress.street').notEmpty().withMessage('Delivery street address required'),
    body('deliveryAddress.city').notEmpty().withMessage('Delivery city required'),
    body('deliveryAddress.pincode').isLength({ min: 6, max: 6 }).withMessage('Valid PIN code required'),
    body('recipientName').trim().isLength({ min: 2, max: 50 }).withMessage('Recipient name required'),
    body('recipientPhone').isMobilePhone().withMessage('Valid recipient phone required'),
    body('weight').isFloat({ min: 0.1, max: 50 }).withMessage('Weight must be between 0.1 and 50 kg'),
    body('deliverySpeed').isIn(['Standard', 'Express', 'Same-day']).withMessage('Invalid delivery speed')
  ],

  // Booking validation (used in bookings route)
  booking: [
    body('pickupAddress.street').notEmpty().withMessage('Pickup street is required'),
    body('pickupAddress.city').notEmpty().withMessage('Pickup city is required'),
    body('pickupAddress.state').notEmpty().withMessage('Pickup state is required'),
    body('pickupAddress.pincode').notEmpty().withMessage('Pickup pincode is required'),
    body('deliveryAddress.street').notEmpty().withMessage('Delivery street is required'),
    body('deliveryAddress.city').notEmpty().withMessage('Delivery city is required'),
    body('deliveryAddress.state').notEmpty().withMessage('Delivery state is required'),
    body('deliveryAddress.pincode').notEmpty().withMessage('Delivery pincode is required'),
    body('recipientName').notEmpty().withMessage('Recipient name is required'),
    body('recipientPhone').notEmpty().withMessage('Recipient phone is required'),
    body('packageType').isIn(['Document', 'Electronics', 'Fragile', 'Clothing', 'Food', 'Others']).withMessage('Valid package type is required'),
    body('weight').isFloat({ min: 0.1, max: 50 }).withMessage('Weight must be between 0.1 and 50 kg'),
    body('deliverySpeed').isIn(['Standard', 'Express', 'Same-day']).withMessage('Valid delivery speed is required'),
    body('pickupDate').isISO8601().withMessage('Valid pickup date is required')
  ],

  // Payment system removed

  // Contact form validation
  contact: [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('message').trim().isLength({ min: 10, max: 500 }).withMessage('Message must be 10-500 characters')
  ],

  // Admin login validation
  adminLogin: [
    body('userName').notEmpty().withMessage('Username is required').trim(),
    body('password').notEmpty().withMessage('Password is required')
  ],

  // Delivery agent login validation
  deliveryAgentLogin: [
    body('agentId').notEmpty().withMessage('Agent ID is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],

  // Review system removed

  // Support ticket validation rules
  createTicket: [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('category').optional().isIn(['General', 'Booking Issue', 'Delivery Problem', 'Payment', 'Technical', 'Others']).withMessage('Valid category is required')
  ],

  addResponse: [
    body('message').notEmpty().withMessage('Response message is required')
  ],

  // User profile validation rules
  updateProfile: [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('phoneNumber').optional().notEmpty().withMessage('Phone number cannot be empty'),
    body('address.street').optional().notEmpty().withMessage('Street cannot be empty'),
    body('address.city').optional().notEmpty().withMessage('City cannot be empty'),
    body('address.state').optional().notEmpty().withMessage('State cannot be empty'),
    body('address.pincode').optional().notEmpty().withMessage('Pincode cannot be empty')
  ],

  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ]
};

// Rate limiting removed for simplified college project

// Custom validation helpers
const customValidators = {
  // Check if email exists
  emailExists: async (email, model) => {
    try {
      const existing = await model.findOne({ email });
      if (existing) {
        throw new Error('Email already exists');
      }
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Validate PIN code format
  isValidPincode: (pincode) => {
    return /^[1-9][0-9]{5}$/.test(pincode);
  },

  // Validate Indian phone number
  isValidIndianPhone: (phone) => {
    return /^[6-9]\d{9}$/.test(phone);
  }
};

module.exports = {
  validate,
  validationRules,
  customValidators
};