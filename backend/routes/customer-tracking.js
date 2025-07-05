const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const Booking = require('../models/Booking');

const router = express.Router();

// @route   GET /api/tracking/:trackingId
// @desc    Track booking by tracking ID
// @access  Public (but can be private if needed)
router.get('/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;

    const booking = await Booking.findOne({ trackingId })
      .populate('userId', 'name email phoneNumber')
      .select('-__v');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found with this tracking ID'
      });
    }

    res.json({
      success: true,
      booking: {
        trackingId: booking.trackingId,
        status: booking.status,
        pickupAddress: booking.pickupAddress,
        deliveryAddress: booking.deliveryAddress,
        recipientName: booking.recipientName,
        packageType: booking.packageType,
        weight: booking.weight,
        deliverySpeed: booking.deliverySpeed,
        estimatedCost: booking.estimatedCost,
        pickupDate: booking.pickupDate,
        expectedDeliveryDate: booking.expectedDeliveryDate,
        actualDeliveryDate: booking.actualDeliveryDate,
        statusHistory: booking.statusHistory,
        createdAt: booking.createdAt
      }
    });
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/tracking/my/:trackingId
// @desc    Track user's own booking (authenticated)
// @access  Private
router.get('/my/:trackingId', authenticateUser, async (req, res) => {
  try {
    const { trackingId } = req.params;

    const booking = await Booking.findOne({ 
      trackingId,
      userId: req.user._id 
    }).select('-__v');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 