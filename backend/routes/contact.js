const express = require('express');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');

const router = express.Router();

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('mobileNumber').isMobilePhone().withMessage('Valid mobile number is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('message').notEmpty().withMessage('Message is required')
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

    const { name, mobileNumber, email, message } = req.body;

    const contact = await new Contact({
      name,
      mobileNumber,
      email,
      message
    }).save();

    res.status(201).json({
      success: true,
      message: 'Your message was sent successfully!',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        createdAt: contact.createdAt
      }
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again'
    });
  }
});

module.exports = router; 