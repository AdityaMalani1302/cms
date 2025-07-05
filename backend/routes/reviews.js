const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateUser } = require('../middleware/auth');
const Review = require('../models/Review');
const Booking = require('../models/Booking');

const router = express.Router();

// Validation rules
const validationRules = {
  create: [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters')
  ],
  update: [
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters')
  ]
};

// Apply authentication to all routes
router.use(authenticateUser);

// Create review
router.post('/', validationRules.create, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bookingId, rating, comment } = req.body;

    // Check if booking exists, belongs to user, and is delivered
    const [booking, existingReview] = await Promise.all([
      Booking.findOne({ _id: bookingId, userId: req.user._id }),
      Review.findOne({ bookingId })
    ]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only review delivered bookings'
      });
    }

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this booking'
      });
    }

    const review = await new Review({
      userId: req.user._id,
      bookingId,
      rating,
      comment
    }).save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's reviews
router.get('/my', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [total, reviews] = await Promise.all([
      Review.countDocuments({ userId: req.user._id }),
      Review.find({ userId: req.user._id })
        .populate('bookingId', 'trackingId deliveryAddress.city packageType estimatedCost createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    res.json({
      success: true,
      reviews,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single review
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('bookingId', 'trackingId deliveryAddress packageType estimatedCost');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update review
router.put('/:id', validationRules.update, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedUpdates = ['rating', 'comment'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete review
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 