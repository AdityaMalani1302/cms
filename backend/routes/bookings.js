const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateUser } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const Booking = require('../models/Booking');
const Courier = require('../models/Courier');
const User = require('../models/User');
// Notification model removed
const logger = require('../utils/logger');
const { calculateShippingCost, calculateExpectedDelivery } = require('../utils/pricingUtils');
const NotificationService = require('../services/notificationService');

const router = express.Router();

// Temporary debug endpoint to see all bookings - MUST BE FIRST
router.get('/admin/debug', async (req, res) => {
  try {
    console.log('🐛 Debug endpoint hit');
    
    const allBookings = await Booking.find({})
      .populate('userId', 'name email')
      .select('trackingId status assignedAgent createdAt pickupAddress deliveryAddress packageType weight userId')
      .sort({ createdAt: -1 })
      .limit(20);
    
    console.log('📊 All bookings:', allBookings.length);
    
    res.json({
      success: true,
      data: allBookings,
      count: allBookings.length
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Utility functions
const utils = {
  // Convert booking status to courier status
  mapBookingToCourierStatus: (bookingStatus) => {
    const statusMap = {
      'Pending Pickup': 'Courier Pickup',
      'Picked Up': 'Shipped',
      'In Transit': 'Intransit',
      'Out for Delivery': 'Out for Delivery',
      'Delivered': 'Delivered',
      'Cancelled': 'Pickup Failed'
    };
    return statusMap[bookingStatus] || 'Courier Pickup';
  },

  // Create courier record from booking data
  createCourierFromBooking: async (booking, user) => {
    try {
      // Use the booking's TRK trackingId as the courier refNumber
      const refNumber = booking.trackingId;
      
      const courier = new Courier({
        refNumber: refNumber,
        senderName: user.name,
        senderContactNumber: user.phoneNumber || '0000000000',
        senderAddress: `${booking.pickupAddress.street}`,
        senderCity: booking.pickupAddress.city,
        senderState: booking.pickupAddress.state,
        senderPincode: booking.pickupAddress.pincode,
        senderCountry: booking.pickupAddress.country || 'India',
        senderBranch: booking.pickupAddress.city, // Use city as branch
        
        recipientName: booking.recipientName,
        recipientContactNumber: booking.recipientPhone,
        recipientAddress: `${booking.deliveryAddress.street}`,
        recipientCity: booking.deliveryAddress.city,
        recipientState: booking.deliveryAddress.state,
        recipientPincode: booking.deliveryAddress.pincode,
        recipientCountry: booking.deliveryAddress.country || 'India',
        
        courierDescription: booking.description || `${booking.packageType} package`,
        parcelWeight: booking.weight.toString(),
        parcelPrice: booking.estimatedCost,
        
        // Default dimensions if not provided
        parcelDimensionLength: '30',
        parcelDimensionWidth: '20', 
        parcelDimensionHeight: '10',
        
        status: utils.mapBookingToCourierStatus(booking.status),
        approvalStatus: 'Pending',  // User applications need approval
        pickupDate: booking.pickupDate,
        expectedDeliveryDate: booking.expectedDeliveryDate
      });

      await courier.save();
      console.log(`✅ Courier created with refNumber: ${courier.refNumber}`);
      return courier;
    } catch (error) {
      console.error('Error creating courier from booking:', error);
      throw error;
    }
  },

  validationRules: {
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
    ]
  }
};

// Admin endpoint to get all bookings with filtering - MUST BE BEFORE MIDDLEWARE
router.get('/admin/all', async (req, res) => {
  try {
    console.log('🔍 Admin endpoint hit with headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
    
    // Temporarily disable auth for testing
    // TODO: Re-enable authentication once working
    /*
    // Manually verify admin token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    */

    console.log('🔍 Admin fetching bookings with filters:', req.query);

    // First, let's see what bookings exist in the database
    const allBookings = await Booking.find({}).select('trackingId status assignedAgent createdAt').sort({ createdAt: -1 }).limit(10);
    console.log('📊 Recent bookings in database:', allBookings.map(b => ({
      trackingId: b.trackingId,
      status: b.status,
      hasAssignedAgent: !!b.assignedAgent,
      createdAt: b.createdAt
    })));

    // Build filter query
    const filter = {};
    
    if (req.query.status) {
      // Make status matching case-insensitive and flexible
      filter.status = new RegExp(req.query.status, 'i');
    }
    
    if (req.query.unassigned === 'true') {
      // Check for bookings that either don't have assignedAgent field or it's null/undefined
      filter.$or = [
        { assignedAgent: { $exists: false } },
        { assignedAgent: null },
        { assignedAgent: undefined }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    console.log('📋 Filter being applied:', filter);

    const [total, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .populate('userId', 'name email phoneNumber')
        .populate('assignedAgent', 'name agentId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('trackingId status estimatedCost pickupDate expectedDeliveryDate pickupAddress deliveryAddress packageType weight recipientName recipientPhone description dimensions createdAt userId assignedAgent')
    ]);

    console.log(`📦 Found ${bookings.length} bookings matching filter`);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Error fetching bookings for admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Apply authentication to all routes except estimate (which needs both admin and customer access)
router.use((req, res, next) => {
  if (req.path === '/estimate' || req.path === '/admin/all' || req.path === '/admin/debug') {
    // Use admin or customer auth for estimate endpoint, skip auth for admin routes (handled above)
    if (req.path === '/estimate') {
      const { authAdminOrCustomer } = require('../middleware/auth');
      return authAdminOrCustomer(req, res, next);
    }
    return next(); // Skip auth for admin routes
  }
  return authenticateUser(req, res, next);
});

// Cost estimation endpoint
router.get('/estimate', async (req, res) => {
  try {
    const { weight, deliverySpeed } = req.query;
    
    if (!weight || !deliverySpeed) {
      return res.status(400).json({
        success: false,
        message: 'Weight and delivery speed are required'
      });
    }
    
    const weightFloat = parseFloat(weight);
    
    // Validate weight
    if (isNaN(weightFloat) || weightFloat <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Weight must be a positive number greater than 0'
      });
    }
    
    const cost = calculateShippingCost(weightFloat, deliverySpeed);
    
    res.json({
      success: true,
      estimatedCost: cost,
      deliverySpeed,
      weight: weightFloat
    });
  } catch (error) {
    console.error('Cost estimation error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error calculating shipping cost' 
    });
  }
});

// Create new booking
router.post('/', [
  ...validationRules.booking,
  validate
], async (req, res) => {
  try {
    const {
      pickupAddress,
      deliveryAddress,
      recipientName,
      recipientPhone,
      packageType,
      weight,
      deliverySpeed,
      description,
      pickupDate
    } = req.body;

    // Calculate cost and expected delivery
    const estimatedCost = calculateShippingCost(weight, deliverySpeed);
    const expectedDeliveryDate = calculateExpectedDelivery(deliverySpeed, pickupDate);

    // Create booking - payment system removed
    const booking = new Booking({
      userId: req.user._id,
      pickupAddress,
      deliveryAddress,
      recipientName,
      recipientPhone,
      packageType,
      weight,
      deliverySpeed,
      estimatedCost,
      description,
      pickupDate: new Date(pickupDate),
      expectedDeliveryDate
    });

    await booking.save();

    // Get user details for courier creation
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new Error('User not found');
    }

    // Create courier record for admin panel
    let courier = null;
    try {
      const refNumber = booking.trackingId || Math.floor(100000000 + Math.random() * 900000000).toString();
      
      courier = new Courier({
        refNumber: refNumber,
        userId: req.user._id, // Add the userId to link courier to user
        senderName: user.name,
        senderContactNumber: user.phoneNumber || '0000000000',
        senderAddress: `${booking.pickupAddress.street}`,
        senderCity: booking.pickupAddress.city,
        senderState: booking.pickupAddress.state,
        senderPincode: booking.pickupAddress.pincode,
        senderCountry: booking.pickupAddress.country || 'India',
        senderBranch: booking.pickupAddress.city,
        
        recipientName: booking.recipientName,
        recipientContactNumber: booking.recipientPhone,
        recipientAddress: `${booking.deliveryAddress.street}`,
        recipientCity: booking.deliveryAddress.city,
        recipientState: booking.deliveryAddress.state,
        recipientPincode: booking.deliveryAddress.pincode,
        recipientCountry: booking.deliveryAddress.country || 'India',
        
        courierDescription: booking.description || `${booking.packageType} package`,
        parcelWeight: booking.weight.toString(),
        parcelPrice: booking.estimatedCost,
        
        parcelDimensionLength: '30',
        parcelDimensionWidth: '20', 
        parcelDimensionHeight: '10',
        
        status: utils.mapBookingToCourierStatus(booking.status),
        approvalStatus: 'Pending',
        pickupDate: booking.pickupDate,
        expectedDeliveryDate: booking.expectedDeliveryDate
      });

      await courier.save();
      console.log(`✅ Courier created with refNumber: ${courier.refNumber}`);
    } catch (courierError) {
      console.error('⚠️ Failed to create courier record:', courierError);
      // Continue even if courier creation fails for college project
    }

    // Create notification for booking
    try {
      await NotificationService.createBookingNotification(req.user._id, booking);
      console.log('✅ Booking notification created');
    } catch (notificationError) {
      console.error('⚠️ Failed to create booking notification:', notificationError);
      // Continue even if notification creation fails
    }

    const result = { booking, courier };

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: result.booking._id,
        trackingId: result.booking.trackingId,
        status: result.booking.status,
        estimatedCost: result.booking.estimatedCost,
        pickupDate: result.booking.pickupDate,
        expectedDeliveryDate: result.booking.expectedDeliveryDate
      }
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Server error during booking creation';
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Validation failed: ' + Object.values(error.errors).map(e => e.message).join(', ');
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate entry detected';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// User's booking history
router.get('/my', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [total, bookings] = await Promise.all([
      Booking.countDocuments({ userId: req.user._id }),
      Booking.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('trackingId status estimatedCost pickupDate expectedDeliveryDate pickupAddress deliveryAddress packageType weight recipientName recipientPhone description dimensions createdAt')
    ]);

    res.json({
      success: true,
      bookings,
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

// Get booking details
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Cancel booking
router.put('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending bookings can be cancelled'
      });
    }

    booking.status = 'Cancelled';
    await booking.save();

    // Create notification
    // Notification service disabled

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Track booking
router.get('/track/:trackingId', async (req, res) => {
  try {
    const booking = await Booking.findOne({
      trackingId: req.params.trackingId
    }).select('trackingId status pickupDate expectedDeliveryDate deliveryAddress packageType createdAt updatedAt');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 