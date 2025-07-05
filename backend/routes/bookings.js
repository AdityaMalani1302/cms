const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateUser } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Courier = require('../models/Courier');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

// Utility functions
const utils = {
  calculateCost: (weight, deliverySpeed) => {
    const baseCost = 50;
    const weightCost = weight * 15;
    const speedMultipliers = { Express: 1.5, 'Same-day': 2, Standard: 1 };
    return Math.round((baseCost + weightCost) * (speedMultipliers[deliverySpeed] || 1));
  },

  calculateExpectedDelivery: (deliverySpeed, pickupDate) => {
    const pickup = new Date(pickupDate);
    const deliveryDays = { Express: 1, 'Same-day': 0, Standard: 3 };
    const expectedDelivery = new Date(pickup);
    expectedDelivery.setDate(pickup.getDate() + (deliveryDays[deliverySpeed] || 3));
    return expectedDelivery;
  },

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
      // Generate refNumber using the booking's tracking ID
      const refNumber = booking.trackingId || Math.floor(100000000 + Math.random() * 900000000).toString();
      
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

// Apply authentication to all routes
router.use(authenticateUser);

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
    
    const cost = utils.calculateCost(parseFloat(weight), deliverySpeed);
    
    res.json({
      success: true,
      estimatedCost: cost,
      deliverySpeed,
      weight: parseFloat(weight)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new booking
router.post('/', utils.validationRules.booking, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

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
    const estimatedCost = utils.calculateCost(weight, deliverySpeed);
    const expectedDeliveryDate = utils.calculateExpectedDelivery(deliverySpeed, pickupDate);

    // Use transaction for booking creation to ensure data consistency
    const { executeInTransaction } = require('../utils/transactionHelper');
    
    const result = await executeInTransaction(async (session) => {
      // Create booking
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

      await booking.save({ session });

      // Get user details for courier creation
      const user = await User.findById(req.user._id).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      // Create courier record for admin panel
      let courier = null;
      try {
        const refNumber = booking.trackingId || Math.floor(100000000 + Math.random() * 900000000).toString();
        
        courier = new Courier({
          refNumber: refNumber,
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

        await courier.save({ session });
        console.log(`✅ Courier created with refNumber: ${courier.refNumber}`);
      } catch (courierError) {
        console.error('⚠️ Failed to create courier record:', courierError);
        // Throw error to rollback transaction if courier creation fails
        throw new Error(`Failed to create courier record: ${courierError.message}`);
      }

      // Create notification
      await new Notification({
        userId: req.user._id,
        title: 'Booking Confirmed',
        message: `Your booking ${booking.trackingId} has been confirmed and is pending pickup.`,
        type: 'Booking',
        relatedBookingId: booking._id
      }).save({ session });

      return { booking, courier };
    });

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
    res.status(500).json({ 
      success: false, 
      message: 'Server error during booking creation' 
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
        .select('trackingId status estimatedCost pickupDate expectedDeliveryDate deliveryAddress packageType createdAt')
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
    await new Notification({
      userId: req.user._id,
      title: 'Booking Cancelled',
      message: `Your booking ${booking.trackingId} has been cancelled.`,
      type: 'Booking',
      relatedBookingId: booking._id
    }).save();

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