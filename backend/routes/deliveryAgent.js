const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const DeliveryAgent = require('../models/DeliveryAgent');
const Booking = require('../models/Booking');
const Courier = require('../models/Courier');
const CourierTracking = require('../models/CourierTracking');
const { authDeliveryAgent, authAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/delivery-agent/login
// @desc    Delivery agent login with email and password
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    console.log('🔐 Delivery agent login attempt:', { email: req.body.email, timestamp: new Date() });
    
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

    // Find agent by email
    console.log('👤 Looking for agent with email:', email);
    const agent = await DeliveryAgent.findOne({ email: email.toLowerCase() });
    
    if (!agent) {
      console.log('❌ Agent not found with email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ Agent found:', { id: agent._id, agentId: agent.agentId, status: agent.status });

    // Check if agent is active
    if (agent.status !== 'active') {
      console.log('❌ Agent account is not active:', agent.status);
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Check password
    console.log('🔑 Checking password...');
    const isMatch = await agent.comparePassword(password);
    console.log('🔑 Password validation result:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password does not match');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT tokens
    console.log('🎟️ Generating JWT tokens...');
    const accessToken = jwt.sign(
      { 
        id: agent._id, 
        userType: 'delivery_agent',
        agentId: agent.agentId,
        branch: agent.assignedBranch
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { 
        id: agent._id, 
        userType: 'delivery_agent'
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for agent:', agent.email);

    res.json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      accessToken,
      refreshToken,
      agent: {
        id: agent._id,
        agentId: agent.agentId,
        name: agent.name,
        email: agent.email,
        assignedBranch: agent.assignedBranch,
        vehicleType: agent.vehicleType,
        isAvailable: agent.isAvailable,
        userType: 'deliveryAgent'
      }
    });
  } catch (error) {
    console.error('💥 Delivery agent login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Admin-accessible routes (before auth middleware)
router.get('/available', async (req, res) => {
  try {
    console.log('👥 Available agents endpoint hit');
    
    const agents = await DeliveryAgent.find({ 
      status: 'active',
      isAvailable: true 
    }).select('name agentId area activeDeliveries vehicleType');
    
    res.json({
      success: true,
      agents
    });
  } catch (error) {
    console.error('Error fetching available agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available agents'
    });
  }
});

router.post('/allocate', async (req, res) => {
  try {
    console.log('🚚 Allocate endpoint hit with body:', req.body);
    
    const { agentId, courierIds } = req.body;
    console.log('📋 Allocation request - Agent ID:', agentId, 'Courier IDs:', courierIds);

    // Validate input
    if (!agentId || !courierIds || !Array.isArray(courierIds) || courierIds.length === 0) {
      console.log('❌ Invalid input data');
      return res.status(400).json({
        success: false,
        message: 'Invalid input data'
      });
    }

    // Find the agent
    console.log('🔍 Looking for agent with ID:', agentId);
    const agent = await DeliveryAgent.findById(agentId);
    console.log('👤 Agent found:', agent ? `${agent.name} (${agent.agentId})` : 'Not found');
    
    if (!agent) {
      console.log('❌ Agent not found');
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    if (!agent.isAvailable) {
      console.log('❌ Agent not available');
      return res.status(404).json({
        success: false,
        message: 'Agent not available'
      });
    }

    const Booking = require('../models/Booking');

    console.log('📦 Updating bookings with IDs:', courierIds);
    // Update all selected bookings
    const updateResult = await Booking.updateMany(
      { 
        _id: { $in: courierIds },
        status: 'pending pickup'
      },
      { 
        $set: {
          assignedAgent: agentId,
          // Keep status as 'pending pickup' or introduce a new 'assigned' status
          // For now, keeping as 'pending pickup' so agent can pick it up
          status: 'pending pickup'
        }
      }
    );
    
    console.log('✅ Booking update result:', updateResult);

    // Update agent's active deliveries count
    console.log('🔄 Updating agent delivery count...');
    agent.activeDeliveries = (agent.activeDeliveries || 0) + courierIds.length;
    if (agent.activeDeliveries >= (agent.maxDeliveries || 10)) {
      agent.isAvailable = false;
    }
    await agent.save();
    console.log('✅ Agent updated successfully');

    res.json({
      success: true,
      message: 'Couriers allocated successfully',
      updatedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error allocating couriers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to allocate couriers'
    });
  }
});

// Apply authentication to all routes below
router.use(authDeliveryAgent);

// @route   GET /api/delivery-agent/profile
// @desc    Get delivery agent profile information
// @access  Private (Delivery Agent)
router.get('/profile', async (req, res) => {
  try {
    const agent = await DeliveryAgent.findById(req.user._id)
      .select('-password -__v');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent profile not found'
      });
    }

    // Calculate basic statistics
    const [totalDeliveries, successfulDeliveries, pendingDeliveries] = await Promise.all([
      Courier.countDocuments({ assignedAgent: req.user._id }),
      Courier.countDocuments({ 
        assignedAgent: req.user._id, 
        status: 'Delivered' 
      }),
      Courier.countDocuments({ 
        assignedAgent: req.user._id, 
        status: { $in: ['Pickup', 'Intransit', 'Out for Delivery'] }
      })
    ]);

    const successRate = totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0;

    res.json({
      success: true,
      data: {
        ...agent.toObject(),
        stats: {
          totalDeliveries,
          successfulDeliveries,
          pendingDeliveries,
          successRate
        }
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/delivery-agent/dashboard
// @desc    Get delivery agent dashboard
// @access  Private (Delivery Agent)
router.get('/dashboard', authDeliveryAgent, async (req, res) => {
  try {
    const agentId = req.user._id;
    
    // Use Booking model with updated status values
    const [assignedDeliveries, completedToday, failedDeliveries, totalDeliveries, recentDeliveries] = await Promise.all([
      Booking.countDocuments({ 
        assignedAgent: agentId,
        status: { $in: ['out for delivery', 'picked up', 'in transit'] }
      }),
      Booking.countDocuments({
        assignedAgent: agentId,
        status: 'delivered',
        actualDeliveryDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      }),
      Booking.countDocuments({
        assignedAgent: agentId,
        status: { $in: ['pickup failed', 'delivery failed'] }
      }),
      Booking.countDocuments({ assignedAgent: agentId }),
      Booking.find({ assignedAgent: agentId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('trackingId recipientName deliveryAddress status expectedDeliveryDate')
    ]);

    // Transform recent deliveries to match expected format
    const formattedRecentDeliveries = recentDeliveries.map(booking => ({
      _id: booking._id,
      refNumber: booking.trackingId,
      recipientName: booking.recipientName,
      recipientAddress: booking.deliveryAddress ? 
        `${booking.deliveryAddress.street}, ${booking.deliveryAddress.city}, ${booking.deliveryAddress.state}` : 
        'Address not available',
      status: booking.status,
      expectedDeliveryDate: booking.expectedDeliveryDate
    }));

    res.json({
      success: true,
      data: {
        stats: {
          assignedDeliveries,
          completedToday,
          failedDeliveries,
          totalDeliveries,
          successRate: totalDeliveries > 0 ? Math.round((completedToday / totalDeliveries) * 100) : 0
        },
        recentDeliveries: formattedRecentDeliveries,
        agent: {
          name: req.user.agentName,
          isAvailable: req.user.isAvailable
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/delivery-agent/assigned-deliveries
// @desc    Get assigned deliveries for agent
// @access  Private (Delivery Agent)
router.get('/assigned-deliveries', authDeliveryAgent, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const agentId = req.user._id;
    const Booking = require('../models/Booking');

    let filter = { assignedAgent: agentId };
    if (status) filter.status = status;

    const [deliveries, total] = await Promise.all([
      Booking.find(filter)
        .populate('userId', 'name phoneNumber')
        .sort({ expectedDeliveryDate: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('trackingId pickupAddress deliveryAddress recipientName recipientPhone status expectedDeliveryDate userId weight packageType'),
      Booking.countDocuments(filter)
    ]);

    // Transform bookings to match expected delivery format
    const transformedDeliveries = deliveries.map(booking => ({
      _id: booking._id,
      refNumber: booking.trackingId,
      senderName: booking.userId?.name || 'Unknown',
      senderContactNumber: booking.userId?.phoneNumber || 'N/A',
      senderAddress: `${booking.pickupAddress.street}, ${booking.pickupAddress.city}, ${booking.pickupAddress.state}`,
      recipientName: booking.recipientName,
      recipientContactNumber: booking.recipientPhone,
      recipientAddress: `${booking.deliveryAddress.street}, ${booking.deliveryAddress.city}, ${booking.deliveryAddress.state}`,
      status: booking.status,
      expectedDeliveryDate: booking.expectedDeliveryDate,
      deliveryAttempts: 0,
      weight: booking.weight,
      packageType: booking.packageType
    }));

    res.json({
      success: true,
      data: {
        deliveries: transformedDeliveries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Assigned deliveries error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/delivery-agent/pickup/:courierId
// @desc    Mark courier as picked up
// @access  Private (Delivery Agent)
router.put('/pickup/:courierId', [
  body('remark').notEmpty().withMessage('Pickup remark is required')
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

    const { courierId } = req.params;
    const { remark, codAmount } = req.body;

    const courier = await Courier.findById(courierId);
    if (!courier || courier.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found or not assigned to you'
      });
    }

    // Update courier status
    courier.status = 'Pickup';
    
    // Handle COD amount if provided
    if (codAmount) {
      courier.codAmount = parseFloat(codAmount);
      courier.codReceived = true;
    }
    
    await courier.save();

    // Add tracking entry
    const tracking = new CourierTracking({
      courierId: courier._id,
      remark: remark || 'Package picked up successfully',
      status: 'Pickup',
      agentId: req.user._id
    });
    await tracking.save();

    res.json({
      success: true,
      message: 'Package marked as picked up successfully',
      data: {
        refNumber: courier.refNumber,
        status: courier.status,
        codAmount: courier.codAmount,
        codReceived: courier.codReceived,
        pickedUpAt: new Date()
      }
    });
  } catch (error) {
    console.error('Pickup update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/delivery-agent/cod/:courierId
// @desc    Mark COD as received
// @access  Private (Delivery Agent)
router.put('/cod/:courierId', [
  body('codAmount').isFloat().withMessage('Valid COD amount is required')
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

    const { courierId } = req.params;
    const { codAmount, remark } = req.body;

    const courier = await Courier.findById(courierId);
    if (!courier || courier.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found or not assigned to you'
      });
    }

    // Update COD information
    courier.codAmount = parseFloat(codAmount);
    courier.codReceived = true;
    courier.codReceivedAt = new Date();
    courier.codReceivedBy = req.user._id;
    
    await courier.save();

    // Add tracking entry
    const tracking = new CourierTracking({
      courierId: courier._id,
      remark: remark || `COD amount of ₹${codAmount} received`,
      status: 'COD Received',
      agentId: req.user._id
    });
    await tracking.save();

    res.json({
      success: true,
      message: 'COD marked as received successfully',
      data: {
        refNumber: courier.refNumber,
        codAmount: courier.codAmount,
        codReceived: courier.codReceived,
        codReceivedAt: courier.codReceivedAt
      }
    });
  } catch (error) {
    console.error('COD update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/delivery-agent/availability
// @desc    Update agent availability
// @access  Private (Delivery Agent)
router.put('/availability', [
  body('isAvailable').isBoolean().withMessage('isAvailable must be boolean')
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

    const { isAvailable } = req.body;
    
    await DeliveryAgent.findByIdAndUpdate(req.user._id, { isAvailable });

    res.json({
      success: true,
      message: `Availability updated to ${isAvailable ? 'available' : 'unavailable'}`,
      data: { isAvailable }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/delivery-agent/update-status/:bookingId
// @desc    Update booking status by delivery agent
// @access  Private (Delivery Agent)
router.put('/update-status/:bookingId', [
  body('status').isIn(['picked up', 'in transit', 'arrived at destination', 'out for delivery', 'delivered', 'pickup failed', 'delivery failed']).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
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

    const { bookingId } = req.params;
    const { status, notes, location } = req.body;
    const agentId = req.user._id;

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is assigned to this agent
    if (booking.assignedAgent && booking.assignedAgent.toString() !== agentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This booking is not assigned to you'
      });
    }

    // Update booking status
    const oldStatus = booking.status;
    booking.status = status;

    // Add to status history
    if (!booking.statusHistory) booking.statusHistory = [];
    booking.statusHistory.push({
      status,
      timestamp: new Date(),
      location: location || `Updated by ${req.user.agentName || 'Delivery Agent'}`,
      notes: notes || `Status updated from ${oldStatus} to ${status}`
    });

    // Update special fields based on status
    if (status === 'picked up') {
      booking.pickupDate = new Date();
    } else if (status === 'delivered') {
      booking.actualDeliveryDate = new Date();
    }

    await booking.save();

    // Use the centralized status update service for notifications
    try {
      const { updateBookingStatus } = require('../services/statusUpdateService');
      await updateBookingStatus(
        booking._id,
        status,
        agentId,
        'delivery_agent',
        notes || `Status updated by delivery agent`
      );
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the status update if notifications fail
    }

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      booking: {
        _id: booking._id,
        trackingId: booking.trackingId,
        status: booking.status,
        statusHistory: booking.statusHistory
      }
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
});

module.exports = router; 