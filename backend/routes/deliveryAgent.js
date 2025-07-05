const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const DeliveryAgent = require('../models/DeliveryAgent');
const Courier = require('../models/Courier');
const CourierTracking = require('../models/CourierTracking');
const { authDeliveryAgent } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/delivery-agent/login
// @desc    Delivery agent login
// @access  Public
router.post('/login', [
  body('agentId').notEmpty().withMessage('Agent ID is required'),
  body('password').notEmpty().withMessage('Password is required')
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

    const { agentId, password } = req.body;

    const agent = await DeliveryAgent.findOne({
      $or: [{ agentId }, { agentEmail: agentId }]
    });

    if (!agent || agent.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or account is inactive'
      });
    }

    const isMatch = await agent.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { 
        id: agent._id, 
        userType: 'delivery_agent',
        agentId: agent.agentId,
        branch: agent.assignedBranch
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      agent: {
        id: agent._id,
        agentId: agent.agentId,
        name: agent.agentName,
        email: agent.agentEmail,
        assignedBranch: agent.assignedBranch,
        vehicleType: agent.vehicleType,
        isAvailable: agent.isAvailable
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Apply authentication to all routes below
router.use(authDeliveryAgent);

// @route   GET /api/delivery-agent/profile
// @desc    Get delivery agent profile information
// @access  Private (Delivery Agent)
router.get('/profile', async (req, res) => {
  try {
    const agent = await DeliveryAgent.findById(req.agent._id)
      .select('-password -__v');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent profile not found'
      });
    }

    // Calculate basic statistics
    const [totalDeliveries, successfulDeliveries, pendingDeliveries] = await Promise.all([
      Courier.countDocuments({ assignedAgent: req.agent._id }),
      Courier.countDocuments({ 
        assignedAgent: req.agent._id, 
        status: 'Delivered' 
      }),
      Courier.countDocuments({ 
        assignedAgent: req.agent._id, 
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
router.get('/dashboard', async (req, res) => {
  try {
    const agentId = req.agent._id;
    
    const [assignedDeliveries, completedToday, failedDeliveries, recentDeliveries] = await Promise.all([
      Courier.countDocuments({ 
        assignedAgent: agentId,
        status: { $in: ['Out for Delivery', 'Pickup', 'Intransit'] }
      }),
      Courier.countDocuments({
        assignedAgent: agentId,
        status: 'Delivered',
        actualDeliveryDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      }),
      Courier.countDocuments({
        assignedAgent: agentId,
        status: { $in: ['Pickup Failed', 'Delivery Failed'] }
      }),
      Courier.find({ assignedAgent: agentId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('refNumber recipientName recipientAddress status expectedDeliveryDate')
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          assignedDeliveries,
          completedToday,
          failedDeliveries,
          totalDeliveries: req.agent.totalDeliveries || 0,
          successRate: req.agent.getSuccessRate ? req.agent.getSuccessRate() : 0
        },
        recentDeliveries,
        agent: {
          name: req.agent.agentName,
          isAvailable: req.agent.isAvailable,
          currentLocation: req.agent.currentLocation
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/delivery-agent/package-info/:id
// @desc    Get detailed package information for delivery agent
// @access  Private (Delivery Agent)
router.get('/package-info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.agent._id;

    const courier = await Courier.findOne({
      _id: id,
      assignedAgent: agentId
    }).populate('userId', 'name email phoneNumber');

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Package not found or not assigned to you'
      });
    }

    res.json({
      success: true,
      data: {
        refNumber: courier.refNumber,
        senderInfo: {
          name: courier.senderName,
          phone: courier.senderContactNumber,
          address: courier.senderAddress
        },
        recipientInfo: {
          name: courier.recipientName,
          phone: courier.recipientContactNumber,
          address: courier.recipientAddress
        },
        packageDetails: {
          weight: courier.weight,
          dimensions: courier.dimensions,
          packageType: courier.packageType,
          serviceType: courier.serviceType,
          instructions: courier.specialInstructions
        },
        status: courier.status,
        expectedDeliveryDate: courier.expectedDeliveryDate,
        deliveryAttempts: courier.deliveryAttempts,
        qrCode: courier.qrCode,
        proofOfDelivery: courier.proofOfDelivery,
        issueReports: courier.issueReports
      }
    });
  } catch (error) {
    console.error('Package info error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/delivery-agent/status/:id
// @desc    Update package status by delivery agent
// @access  Private (Delivery Agent)
router.put('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, location } = req.body;
    const agentId = req.agent._id;

    const validStatuses = ['Pickup', 'Intransit', 'Out for Delivery', 'Delivered', 'Pickup Failed', 'Delivery Failed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const courier = await Courier.findOne({
      _id: id,
      assignedAgent: agentId
    });

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Package not found or not assigned to you'
      });
    }

    // Update status
    courier.status = status;
    
    // Add to status history
    courier.statusHistory.push({
      status,
      timestamp: new Date(),
      location: location || '',
      notes: notes || '',
      updatedBy: agentId
    });

    // Update delivery attempts for failed deliveries
    if (status.includes('Failed')) {
      courier.deliveryAttempts += 1;
    }

    // Set actual delivery date if delivered
    if (status === 'Delivered') {
      courier.actualDeliveryDate = new Date();
    }

    await courier.save();

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        refNumber: courier.refNumber,
        status: courier.status,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/delivery-agent/report-issue
// @desc    Report delivery issue
// @access  Private (Delivery Agent)
router.post('/report-issue', async (req, res) => {
  try {
    const { courierId, issueType, description, severity, location } = req.body;
    const agentId = req.agent._id;

    if (!courierId || !issueType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Courier ID, issue type, and description are required'
      });
    }

    const courier = await Courier.findOne({
      _id: courierId,
      assignedAgent: agentId
    });

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Package not found or not assigned to you'
      });
    }

    const issueReport = {
      type: issueType,
      description,
      severity: severity || 'medium',
      location: location || '',
      reportedBy: agentId,
      reportedAt: new Date(),
      status: 'open'
    };

    if (!courier.issueReports) {
      courier.issueReports = [];
    }
    courier.issueReports.push(issueReport);

    // Update courier status based on issue type
    if (issueType === 'delivery_failed') {
      courier.status = 'Delivery Failed';
      courier.deliveryAttempts += 1;
    } else if (issueType === 'damage') {
      courier.status = 'Damaged';
    } else if (issueType === 'address_issue') {
      courier.status = 'Address Verification Needed';
    }

    await courier.save();

    res.json({
      success: true,
      message: 'Issue reported successfully',
      data: {
        issueId: issueReport._id,
        refNumber: courier.refNumber,
        status: courier.status
      }
    });
  } catch (error) {
    console.error('Report issue error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/delivery-agent/profile
// @desc    Update delivery agent profile
// @access  Private (Delivery Agent)
router.put('/profile', async (req, res) => {
  try {
    const agentId = req.agent._id;
    const { agentName, agentEmail, phoneNumber, vehicleType, vehicleNumber, emergencyContact } = req.body;

    const agent = await DeliveryAgent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Update allowed fields
    if (agentName) agent.agentName = agentName;
    if (agentEmail) agent.agentEmail = agentEmail;
    if (phoneNumber) agent.phoneNumber = phoneNumber;
    if (vehicleType) agent.vehicleType = vehicleType;
    if (vehicleNumber) agent.vehicleNumber = vehicleNumber;
    if (emergencyContact) agent.emergencyContact = emergencyContact;

    await agent.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        agentName: agent.agentName,
        agentEmail: agent.agentEmail,
        phoneNumber: agent.phoneNumber,
        vehicleType: agent.vehicleType,
        vehicleNumber: agent.vehicleNumber,
        emergencyContact: agent.emergencyContact
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/delivery-agent/performance-stats
// @desc    Get delivery agent performance statistics
// @access  Private (Delivery Agent)
router.get('/performance-stats', async (req, res) => {
  try {
    const agentId = req.agent._id;
    const { period = '30' } = req.query; // days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      averageDeliveryTime,
      onTimeDeliveries,
      totalDistance
    ] = await Promise.all([
      Courier.countDocuments({
        assignedAgent: agentId,
        createdAt: { $gte: startDate }
      }),
      Courier.countDocuments({
        assignedAgent: agentId,
        status: 'Delivered',
        createdAt: { $gte: startDate }
      }),
      Courier.countDocuments({
        assignedAgent: agentId,
        status: { $in: ['Delivery Failed', 'Pickup Failed'] },
        createdAt: { $gte: startDate }
      }),
      Courier.aggregate([
        {
          $match: {
            assignedAgent: agentId,
            status: 'Delivered',
            actualDeliveryDate: { $exists: true },
            createdAt: { $gte: startDate }
          }
        },
        {
          $project: {
            deliveryTime: {
              $subtract: ['$actualDeliveryDate', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$deliveryTime' }
          }
        }
      ]),
      Courier.countDocuments({
        assignedAgent: agentId,
        status: 'Delivered',
        $expr: { $lte: ['$actualDeliveryDate', '$expectedDeliveryDate'] },
        createdAt: { $gte: startDate }
      }),
      // Mock distance calculation - in real app would integrate with GPS tracking
      Promise.resolve(Math.floor(Math.random() * 1000) + 500)
    ]);

    const successRate = totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0;
    const onTimeRate = successfulDeliveries > 0 ? Math.round((onTimeDeliveries / successfulDeliveries) * 100) : 0;
    const avgDeliveryHours = averageDeliveryTime[0] ? Math.round(averageDeliveryTime[0].avgTime / (1000 * 60 * 60)) : 0;

    res.json({
      success: true,
      data: {
        period: parseInt(period),
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate,
        onTimeDeliveries,
        onTimeRate,
        averageDeliveryTime: avgDeliveryHours,
        totalDistance,
        efficiency: {
          deliveriesPerDay: Math.round(totalDeliveries / parseInt(period)),
          rating: Math.min(5, Math.max(1, successRate / 20)) // 1-5 rating based on success rate
        }
      }
    });
  } catch (error) {
    console.error('Performance stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/delivery-agent/location-update
// @desc    Update current location of delivery agent
// @access  Private (Delivery Agent)
router.post('/location-update', async (req, res) => {
  try {
    const agentId = req.agent._id;
    const { latitude, longitude, accuracy, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const agent = await DeliveryAgent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    agent.currentLocation = {
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
      address: address || '',
      accuracy: accuracy || 0,
      lastUpdated: new Date()
    };

    await agent.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        updatedAt: agent.currentLocation.lastUpdated
      }
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/delivery-agent/route-optimization
// @desc    Get optimized delivery route for assigned packages
// @access  Private (Delivery Agent)
router.get('/route-optimization', async (req, res) => {
  try {
    const agentId = req.agent._id;
    
    // Get active deliveries for the agent
    const deliveries = await Courier.find({
      assignedAgent: agentId,
      status: { $in: ['Pickup', 'Intransit', 'Out for Delivery'] }
    }).select('refNumber recipientAddress expectedDeliveryDate priority');

    if (deliveries.length === 0) {
      return res.json({
        success: true,
        message: 'No active deliveries found',
        data: { optimizedRoute: [], estimatedTime: 0, totalDistance: 0 }
      });
    }

    // Simple route optimization (in production, would use Google Maps API or similar)
    const optimizedRoute = deliveries
      .sort((a, b) => {
        // Sort by priority and expected delivery date
        if (a.priority !== b.priority) {
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
        }
        return new Date(a.expectedDeliveryDate) - new Date(b.expectedDeliveryDate);
      })
      .map((delivery, index) => ({
        sequence: index + 1,
        refNumber: delivery.refNumber,
        address: delivery.recipientAddress,
        expectedDeliveryDate: delivery.expectedDeliveryDate,
        priority: delivery.priority || 'medium',
        estimatedArrival: new Date(Date.now() + (index + 1) * 45 * 60 * 1000) // 45 min intervals
      }));

    const estimatedTime = optimizedRoute.length * 45; // minutes
    const totalDistance = optimizedRoute.length * 5; // mock 5km per delivery

    res.json({
      success: true,
      data: {
        optimizedRoute,
        totalDeliveries: optimizedRoute.length,
        estimatedTime,
        totalDistance,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/delivery-agent/assigned-deliveries
// @desc    Get assigned deliveries for agent
// @access  Private (Delivery Agent)
router.get('/assigned-deliveries', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const agentId = req.agent._id;

    let filter = { assignedAgent: agentId };
    if (status) filter.status = status;

    const [deliveries, total] = await Promise.all([
      Courier.find(filter)
        .sort({ expectedDeliveryDate: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('refNumber senderName senderContactNumber senderAddress recipientName recipientContactNumber recipientAddress status expectedDeliveryDate deliveryAttempts'),
      Courier.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        deliveries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Generic status update function
const updateCourierStatus = async (req, res, newStatus, successMessage) => {
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
    const { remark, latitude, longitude } = req.body;

    const courier = await Courier.findById(courierId);
    if (!courier || courier.assignedAgent.toString() !== req.agent._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found or not assigned to you'
      });
    }

    // Use transaction for status update to ensure data consistency
    const { executeInTransaction } = require('../utils/transactionHelper');
    
    const result = await executeInTransaction(async (session) => {
      // Update courier status
      courier.status = newStatus;
      if (newStatus === 'Delivered') {
        courier.actualDeliveryDate = new Date();
      }
      await courier.save({ session });

      // Add tracking entry
      const tracking = new CourierTracking({
        courierId: courier._id,
        remark,
        status: newStatus,
        agentId: req.agent._id,
        location: latitude && longitude ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : undefined
      });
      await tracking.save({ session });

      // Update delivery agent statistics if delivery completed
      if (newStatus === 'Delivered') {
        const agent = await DeliveryAgent.findById(req.agent._id).session(session);
        agent.successfulDeliveries = (agent.successfulDeliveries || 0) + 1;
        agent.totalDeliveries = (agent.totalDeliveries || 0) + 1;
        agent.isAvailable = true;
        await agent.save({ session });
      } else if (newStatus === 'Pickup Failed' || newStatus === 'Delivery Failed') {
        const agent = await DeliveryAgent.findById(req.agent._id).session(session);
        agent.failedDeliveries = (agent.failedDeliveries || 0) + 1;
        agent.totalDeliveries = (agent.totalDeliveries || 0) + 1;
        agent.isAvailable = true;
        await agent.save({ session });
      }

      return { courier, tracking };
    });

    res.json({
      success: true,
      message: successMessage,
      data: {
        refNumber: result.courier.refNumber,
        status: result.courier.status,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Status update endpoints using the generic function
router.put('/pickup/:courierId', [
  body('remark').notEmpty().withMessage('Pickup remark is required'),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat()
], (req, res) => updateCourierStatus(req, res, 'Pickup', 'Courier marked as picked up'));

router.put('/deliver/:courierId', [
  body('remark').notEmpty().withMessage('Delivery remark is required'),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat()
], (req, res) => updateCourierStatus(req, res, 'Delivered', 'Courier marked as delivered'));

router.put('/fail/:courierId', [
  body('remark').notEmpty().withMessage('Failure reason is required'),
  body('failureType').isIn(['pickup_failed', 'delivery_failed']).withMessage('Invalid failure type')
], (req, res) => {
  const status = req.body.failureType === 'pickup_failed' ? 'Pickup Failed' : 'Delivery Failed';
  updateCourierStatus(req, res, status, 'Courier marked as failed');
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
    
    await DeliveryAgent.findByIdAndUpdate(req.agent._id, { isAvailable });

    res.json({
      success: true,
      message: `Availability updated to ${isAvailable ? 'available' : 'unavailable'}`,
      data: { isAvailable }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/delivery-agent/location
// @desc    Update agent location
// @access  Private (Delivery Agent)
router.put('/location', [
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required')
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

    const { latitude, longitude } = req.body;
    
    await DeliveryAgent.findByIdAndUpdate(req.agent._id, {
      currentLocation: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      lastLocationUpdate: new Date()
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/delivery-agent/package-info/:identifier
// @desc    Get package info by tracking number or QR code for scanning
// @access  Private (Delivery Agent)
router.get('/package-info/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    const courier = await Courier.findOne({
      $and: [
        { assignedAgent: req.agent._id },
        {
          $or: [
            { refNumber: identifier },
            { _id: identifier }
          ]
        }
      ]
    });

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Package not found or not assigned to you'
      });
    }

    res.json({
      success: true,
      data: courier
    });
  } catch (error) {
    console.error('Package info error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/delivery-agent/status/:courierId
// @desc    Update courier status (generic status update)
// @access  Private (Delivery Agent)
router.put('/status/:courierId', [
  body('status').notEmpty().withMessage('Status is required'),
  body('remark').optional().isString()
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
    const { status, remark } = req.body;

    const courier = await Courier.findById(courierId);
    if (!courier || courier.assignedAgent.toString() !== req.agent._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found or not assigned to you'
      });
    }

    // Update courier status
    courier.status = status;
    if (status === 'Delivered') {
      courier.actualDeliveryDate = new Date();
    }
    await courier.save();

    // Add tracking entry
    const tracking = new CourierTracking({
      courierId: courier._id,
      remark: remark || `Status updated to ${status}`,
      status: status,
      agentId: req.agent._id
    });
    await tracking.save();

    res.json({
      success: true,
      message: `Package status updated to ${status}`,
      data: {
        refNumber: courier.refNumber,
        status: courier.status,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/delivery-agent/delivery/:courierId
// @desc    Mark courier as delivered
// @access  Private (Delivery Agent)
router.put('/delivery/:courierId', [
  body('remark').optional().isString(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat()
], async (req, res) => {
  try {
    const { courierId } = req.params;
    const { remark, latitude, longitude } = req.body;

    const courier = await Courier.findById(courierId);
    if (!courier || courier.assignedAgent.toString() !== req.agent._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found or not assigned to you'
      });
    }

    // Update courier status
    courier.status = 'Delivered';
    courier.actualDeliveryDate = new Date();
    await courier.save();

    // Add tracking entry
    const tracking = new CourierTracking({
      courierId: courier._id,
      remark: remark || 'Package delivered successfully',
      status: 'Delivered',
      agentId: req.agent._id,
      location: latitude && longitude ? { 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude) 
      } : undefined
    });
    await tracking.save();

    res.json({
      success: true,
      message: 'Package marked as delivered successfully',
      data: {
        refNumber: courier.refNumber,
        status: courier.status,
        deliveredAt: courier.actualDeliveryDate
      }
    });
  } catch (error) {
    console.error('Delivery update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/delivery-agent/courier/:courierId
// @desc    Get courier details by ID
// @access  Private (Delivery Agent)
router.get('/courier/:courierId', async (req, res) => {
  try {
    const courier = await Courier.findOne({ 
      _id: req.params.courierId,
      assignedAgent: req.agent._id 
    });

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found or not assigned to you'
      });
    }

    const tracking = await CourierTracking.find({ courierId: courier._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { courier, tracking }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/delivery-agent/report-issue
// @desc    Report an issue during delivery
// @access  Private (Delivery Agent)
router.post('/report-issue', [
  body('issueType').notEmpty().withMessage('Issue type is required'),
  body('severity').notEmpty().withMessage('Severity is required'),
  body('title').notEmpty().withMessage('Issue title is required'),
  body('description').notEmpty().withMessage('Issue description is required')
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

    const { 
      issueType, 
      severity, 
      title, 
      description, 
      deliveryId,
      customerNotAvailable,
      addressIssue,
      packageDamaged,
      vehicleProblem,
      location
    } = req.body;

    // Create issue report (using SupportTicket model as a base)
    const SupportTicket = require('../models/SupportTicket');
    
    const issueReport = new SupportTicket({
      userId: null, // Not associated with a customer user
      agentId: req.agent._id,
      subject: title,
      description: description,
      status: 'open',
      priority: severity === 'critical' ? 'high' : severity === 'high' ? 'medium' : 'low',
      category: issueType,
      metadata: {
        deliveryId,
        customerNotAvailable,
        addressIssue,
        packageDamaged,
        vehicleProblem,
        location: location ? JSON.parse(location) : null,
        reportedBy: 'delivery_agent',
        agentInfo: {
          agentId: req.agent.agentId,
          name: req.agent.agentName,
          email: req.agent.agentEmail
        }
      }
    });

    await issueReport.save();

    // If it's related to a specific delivery, add a tracking entry
    if (deliveryId) {
      try {
        const courier = await Courier.findById(deliveryId);
        if (courier && courier.assignedAgent.toString() === req.agent._id.toString()) {
          const tracking = new CourierTracking({
            courierId: courier._id,
            remark: `Issue reported: ${title}`,
            status: 'Issue Reported',
            agentId: req.agent._id
          });
          await tracking.save();
        }
      } catch (trackingError) {
        console.error('Error adding tracking entry:', trackingError);
        // Don't fail the whole request for tracking errors
      }
    }

    res.json({
      success: true,
      message: 'Issue reported successfully',
      data: {
        ticketId: issueReport._id,
        ticketNumber: issueReport.ticketNumber,
        status: issueReport.status
      }
    });
  } catch (error) {
    console.error('Report issue error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 