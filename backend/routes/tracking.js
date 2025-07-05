const express = require('express');
const { body, validationResult } = require('express-validator');
const Courier = require('../models/Courier');
const CourierTracking = require('../models/CourierTracking');

const router = express.Router();

// Utility function to format courier data
const formatCourierData = (courier, trackingHistory) => ({
  courier: {
    refNumber: courier.refNumber,
    status: courier.status,
    sender: {
      name: courier.senderName,
      address: courier.senderAddress,
      city: courier.senderCity,
      state: courier.senderState,
      pincode: courier.senderPincode,
      country: courier.senderCountry,
      contactNumber: courier.senderContactNumber
    },
    recipient: {
      name: courier.recipientName,
      address: courier.recipientAddress,
      city: courier.recipientCity,
      state: courier.recipientState,
      pincode: courier.recipientPincode,
      country: courier.recipientCountry,
      contactNumber: courier.recipientContactNumber
    },
    parcel: {
      description: courier.courierDescription,
      weight: courier.parcelWeight,
      dimensions: {
        length: courier.parcelDimensionLength,
        width: courier.parcelDimensionWidth,
        height: courier.parcelDimensionHeight
      },
      price: courier.parcelPrice
    },
    createdAt: courier.createdAt
  },
  trackingHistory: trackingHistory.map(track => ({
    date: track.createdAt,
    status: track.status,
    remark: track.remark
  }))
});

// Generic tracking function
const getTrackingData = async (refNumber) => {
  const courier = await Courier.findOne({ refNumber: refNumber.trim() });
  
  if (!courier) {
    return null;
  }

  const trackingHistory = await CourierTracking.find({ courierId: courier._id })
    .sort({ createdAt: 1 });

  return formatCourierData(courier, trackingHistory);
};

// Search courier by reference number (POST)
router.post('/search', [
  body('refNumber').notEmpty().withMessage('Reference number is required')
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

    const data = await getTrackingData(req.body.refNumber);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Tracking / Reference Number'
      });
    }

    res.json({
      success: true,
      message: 'Tracking details found',
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get courier tracking by reference number (GET)
router.get('/:refNumber', async (req, res) => {
  try {
    const data = await getTrackingData(req.params.refNumber);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Tracking / Reference Number'
      });
    }

    res.json({
      success: true,
      message: 'Tracking details found',
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
 