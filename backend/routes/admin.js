const express = require('express');
const { body, validationResult } = require('express-validator');
const { createGenericRoutes } = require('../controllers/genericController');
const analyticsService = require('../services/analyticsService');
const { validateSessionMiddleware } = require('../middleware/sessionManager');

// Import models
const Admin = require('../models/Admin');
const Courier = require('../models/Courier');
const Branch = require('../models/Branch');
const DeliveryAgent = require('../models/DeliveryAgent');
const Complaint = require('../models/Complaint');
const Contact = require('../models/Contact');
const User = require('../models/User');

// Import configurations
const { 
  courierConfig, 
  branchConfig, 
  deliveryAgentConfig, 
  complaintConfig 
} = require('../config/routeConfigs');

const router = express.Router();

// Import route modules  
const courierRoutes = require('./courier');
const branchRoutes = require('./branches');
const complaintRoutes = require('./complaints');
const contactRoutes = require('./contact');

// Apply session validation to all routes (includes admin authentication)
router.use(validateSessionMiddleware);

// Additional admin-specific validation and user attachment middleware
router.use(async (req, res, next) => {
  try {
    console.log('🔐 Admin middleware hit:', {
      method: req.method,
      path: req.path,
      sessionExists: !!req.session,
      sessionUserType: req.session?.userType,
      sessionUserId: req.session?.userId
    });
    
    // The session middleware already validates the token and session
    // Just verify that the user is an admin and attach user data
    if (req.session && req.session.userType === 'admin') {
      // Fetch admin user data for route compatibility
      const admin = await Admin.findById(req.session.userId).select('-adminPassword');
      
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin user not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Attach user data for route compatibility
      req.user = admin;
      req.userType = req.session.userType;
      req.userId = req.session.userId;
      req.isAdmin = true;
      
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
});

// === ADMIN PROFILE ROUTES ===
router.get('/profile', async (req, res) => {
  try {
    const admin = req.user; // From auth middleware
    
    res.json({
      success: true,
      data: {
        id: admin._id,
        adminName: admin.adminName,
        email: admin.adminEmail, // FIX: Use correct field name
        phone: admin.phone,
        department: admin.department || 'Administration',
        role: admin.role || 'Super Admin',
        bio: admin.bio || 'System Administrator for Courier Management System',
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { adminName, email, phone, department, role, bio } = req.body;
    const adminId = req.user._id;
    
    const Admin = require('../models/Admin');
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      {
        adminName,
        email,
        phone,
        department,
        role,
        bio
      },
      { new: true, runValidators: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: updatedAdmin._id,
        adminName: updatedAdmin.adminName,
        email: updatedAdmin.email,
        phone: updatedAdmin.phone,
        department: updatedAdmin.department,
        role: updatedAdmin.role,
        bio: updatedAdmin.bio
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const Admin = require('../models/Admin');
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    admin.adminPassword = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password'
    });
  }
});

// === CUSTOM COURIER OPERATIONS ===
// Bulk track couriers
router.post('/couriers/bulk-track', async (req, res) => {
  try {
    const { trackingIds } = req.body;

    if (!Array.isArray(trackingIds) || trackingIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of tracking IDs'
      });
    }

    const couriers = await Courier.find({
      refNumber: { $in: trackingIds }
    }).select('refNumber senderName recipientName status senderCity recipientCity createdAt updatedAt');

    res.json({
      success: true,
      data: couriers,
      message: `Found ${couriers.length} out of ${trackingIds.length} couriers`
    });
  } catch (error) {
    console.error('Bulk track error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update courier status
router.post('/couriers/update-status', async (req, res) => {
  try {
    const { refNumber, status } = req.body;

    if (!refNumber || !status) {
      return res.status(400).json({
        success: false,
        message: 'Reference number and status are required'
      });
    }

    const validStatuses = [
      'Courier Pickup',
      'Shipped',
      'Intransit',
      'Arrived at Destination',
      'Out for Delivery',
      'Delivered',
      'Pickup Failed',
      'Delivery Failed'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status provided'
      });
    }

    const courier = await Courier.findOneAndUpdate(
      { refNumber },
      { 
        status,
        updatedAt: new Date(),
        ...(status === 'Delivered' && { actualDeliveryDate: new Date() })
      },
      { new: true }
    );

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }

    res.json({
      success: true,
      data: courier,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Bulk update courier status
router.post('/couriers/bulk-update-status', async (req, res) => {
  try {
    const { refNumbers, status } = req.body;

    if (!Array.isArray(refNumbers) || refNumbers.length === 0 || !status) {
      return res.status(400).json({
        success: false,
        message: 'Reference numbers array and status are required'
      });
    }

    const validStatuses = [
      'Courier Pickup',
      'Shipped',
      'Intransit',
      'Arrived at Destination',
      'Out for Delivery',
      'Delivered',
      'Pickup Failed',
      'Delivery Failed'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status provided'
      });
    }

    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (status === 'Delivered') {
      updateData.actualDeliveryDate = new Date();
    }

    const result = await Courier.updateMany(
      { refNumber: { $in: refNumbers } },
      updateData
    );

    res.json({
      success: true,
      updated: result.modifiedCount,
      message: `${result.modifiedCount} couriers updated successfully`
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Unified status update endpoint for both Bookings and Couriers
router.put('/couriers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status: rawStatus } = req.body;
    const status = rawStatus?.trim?.() || rawStatus;
    const adminId = req.session.userId;

    console.log('📋 Admin updating courier/booking status:', { id, rawStatus, status, adminId });

    // Import the status update service
    const { updateBookingStatus, getValidStatuses } = require('../services/statusUpdateService');
    
    // Validate status
    const validStatuses = getValidStatuses();
    console.log('🔍 Status validation:', {
      receivedStatus: status,
      statusType: typeof status,
      statusLength: status?.length,
      validStatuses: validStatuses,
      isValid: validStatuses.includes(status)
    });
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${status}" (type: ${typeof status}). Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    // Try to find as Booking first (new system)
    const Booking = require('../models/Booking');
    let booking = await Booking.findById(id);

    if (booking) {
      // Update using the centralized status update service
      const result = await updateBookingStatus(
        id,
        status,
        adminId,
        'admin',
        'Status updated by admin via ManageCouriers'
      );

      console.log('✅ Booking status updated successfully');
      return res.json({
        success: true,
        message: 'Booking status updated successfully',
        data: result.booking,
        notificationsCreated: result.notificationsCreated
      });
    }

    // Fallback to Courier model (legacy system)
    const courier = await Courier.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier/Booking not found'
      });
    }

    console.log('✅ Courier status updated successfully (legacy)');
    res.json({
      success: true,
      message: 'Courier status updated successfully',
      data: courier
    });

  } catch (error) {
    console.error('❌ Error updating courier status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update status'
    });
  }
});

// Courier approval endpoints (before mounting courier routes)
router.put('/couriers/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;
    
    const courier = await Courier.findByIdAndUpdate(
      id,
      {
        approvalStatus: 'Approved',
        approvedBy: adminId,
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }

    console.log(`✅ Courier ${courier.refNumber} approved by admin ${adminId}`);

    res.json({
      success: true,
      message: 'Courier application approved successfully',
      data: courier
    });
  } catch (error) {
    console.error('Error approving courier:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/couriers/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user._id;
    
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const courier = await Courier.findByIdAndUpdate(
      id,
      {
        approvalStatus: 'Rejected',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: rejectionReason.trim()
      },
      { new: true }
    );

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }

    console.log(`❌ Courier ${courier.refNumber} rejected by admin ${adminId}: ${rejectionReason}`);

    res.json({
      success: true,
      message: 'Courier application rejected',
      data: courier
    });
  } catch (error) {
    console.error('Error rejecting courier:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/couriers/pending-approval', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [total, couriers] = await Promise.all([
      Courier.countDocuments({ approvalStatus: 'Pending' }),
      Courier.find({ approvalStatus: 'Pending' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('approvedBy', 'name email')
    ]);

    res.json({
      success: true,
      data: couriers,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching pending couriers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// === COMPLAINT MANAGEMENT ROUTES ===
// Create admin complaint routes using generic CRUD
const complaintCRUD = require('../controllers/genericController').createGenericCRUD(Complaint, complaintConfig);

// Admin complaint routes (read, update, delete only - no create)
router.get('/complaints', complaintCRUD.getAll);
router.get('/complaints/stats', complaintCRUD.getStats);
router.get('/complaints/:id', complaintCRUD.getById);
// Custom route for admin responses to complaints
router.put('/complaints/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { responseText, status = 'In Progress' } = req.body;
    const adminId = req.session.userId || req.user?._id;

    if (!responseText || !responseText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required'
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Add admin response to communication history
    complaint.communicationHistory.push({
      type: 'Admin Response',
      message: responseText.trim(),
      addedBy: adminId,
      addedAt: new Date(),
      isInternal: false
    });

    // Update the remark field as well for backward compatibility
    complaint.remark = responseText.trim();
    complaint.status = status;
    complaint.updationDate = new Date();

    await complaint.save();

    // Create notification for the customer about the admin response
    try {
      const NotificationService = require('../services/notificationService');
      
      // Find the user by email to get their user ID
      const user = await User.findOne({ email: complaint.customerInfo.email });
      
      if (user) {
        await NotificationService.createComplaintResponseNotification(user._id, {
          _id: complaint._id,
          ticketNumber: complaint.ticketNumber
        });
        console.log(`✅ Notification created for complaint response ${complaint.ticketNumber}`);
      }
    } catch (notificationError) {
      console.error('Failed to create notification for complaint response:', notificationError);
      // Don't fail the response if notification creation fails
    }

    console.log(`✅ Admin response added to complaint ${complaint.ticketNumber}`);

    res.json({
      success: true,
      message: 'Response sent successfully',
      data: complaint
    });

  } catch (error) {
    console.error('Error adding admin response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send response'
    });
  }
});

router.put('/complaints/:id', complaintCRUD.update);
router.delete('/complaints/:id', complaintCRUD.delete);

// === BOOKING ROUTES FOR ADMIN ===
// Get all bookings for admin manage couriers section
router.get('/bookings/admin/all', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Import Booking model
    const Booking = require('../models/Booking');

    // Build query object
    let query = {};
    
    if (search) {
      query.$or = [
        { trackingId: { $regex: search, $options: 'i' } },
        { recipientName: { $regex: search, $options: 'i' } },
        { 'pickupAddress.city': { $regex: search, $options: 'i' } },
        { 'deliveryAddress.city': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const bookings = await Booking.find(query)
      .populate('userId', 'name email phoneNumber')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments(query);

    // Transform data to match courier format expected by frontend
    const transformedData = bookings.map(booking => ({
      _id: booking._id,
      refNumber: booking.trackingId,
      senderName: booking.userId?.name || 'Customer',
      senderContactNumber: booking.userId?.phoneNumber || 'N/A',
      senderAddress: booking.pickupAddress ? `${booking.pickupAddress.street}, ${booking.pickupAddress.city}, ${booking.pickupAddress.state} ${booking.pickupAddress.pincode}` : 'N/A',
      senderCity: booking.pickupAddress?.city || 'N/A',
      senderState: booking.pickupAddress?.state || 'N/A',
      senderPincode: booking.pickupAddress?.pincode || '',
      recipientName: booking.recipientName,
      recipientContactNumber: booking.recipientPhone,
      recipientAddress: booking.deliveryAddress ? `${booking.deliveryAddress.street}, ${booking.deliveryAddress.city}, ${booking.deliveryAddress.state} ${booking.deliveryAddress.pincode}` : 'N/A',
      recipientCity: booking.deliveryAddress?.city || 'N/A',
      recipientState: booking.deliveryAddress?.state || 'N/A',
      recipientPincode: booking.deliveryAddress?.pincode || '',
      courierDescription: booking.description || booking.packageType,
      packageType: booking.packageType,
      parcelWeight: booking.weight,
      parcelPrice: booking.estimatedCost,
      deliverySpeed: booking.deliverySpeed,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      isBooking: true
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalBookings / limit);

    res.json({
      success: true,
      data: transformedData,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total: totalBookings,
        limit: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching bookings for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
});

// Mount route groups
router.use('/couriers', courierRoutes);
router.use('/branches', branchRoutes);
router.use('/contacts', contactRoutes);

// === DELIVERY AGENT BASIC ROUTES ===
// Get all delivery agents
router.get('/delivery-agents', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { agentId: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const agents = await DeliveryAgent.find(query)
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await DeliveryAgent.countDocuments(query);
    
    res.json({
      success: true,
      data: agents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + agents.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching delivery agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery agents'
    });
  }
});

// Create new delivery agent
router.post('/delivery-agents', [
  body('agentName').notEmpty().withMessage('Agent name is required'),
  body('agentEmail').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('agentMobileNumber').notEmpty().withMessage('Mobile number is required'),
  body('assignedBranch').notEmpty().withMessage('Assigned branch is required'),
  body('vehicleType').notEmpty().withMessage('Vehicle type is required'),
  body('vehicleNumber').optional(),
  body('licenseNumber').optional()
], async (req, res) => {
  try {
    console.log('🔍 Create delivery agent endpoint hit');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if agent with email already exists
    console.log('Attempting to create agent with email:', req.body.agentEmail, 'and mobile:', req.body.agentMobileNumber);
    const existingAgent = await DeliveryAgent.findOne({ 
      $or: [
        { email: req.body.agentEmail },
        { phoneNumber: req.body.agentMobileNumber }
      ]
    });
    console.log('Existing agent check result:', existingAgent);

    if (existingAgent) {
      let message = 'Agent with this';
      if (existingAgent.email === req.body.agentEmail) {
        message += ` email (${req.body.agentEmail})`;
      }
      if (existingAgent.phoneNumber === req.body.agentMobileNumber) {
        if (existingAgent.email === req.body.agentEmail) {
          message += ' and';
        }
        message += ` mobile number (${req.body.agentMobileNumber})`;
      }
      message += ' already exists.';
      return res.status(400).json({
        success: false,
        message
      });
    }

    // Generate unique agent ID
    let agentId = req.body.agentId;
    if (!agentId) {
      const lastAgent = await DeliveryAgent.findOne().sort({ agentId: -1 }).exec();
      let nextIdNumber = 1;
      if (lastAgent && lastAgent.agentId && lastAgent.agentId.startsWith('DA')) {
        const lastId = parseInt(lastAgent.agentId.substring(2), 10);
        if (!isNaN(lastId)) {
          nextIdNumber = lastId + 1;
        }
      }
      agentId = `DA${String(nextIdNumber).padStart(4, '0')}`;
    }

    // Create new agent
    const agentData = {
      agentId,
      name: req.body.agentName,
      email: req.body.agentEmail,
      password: req.body.password || req.body.agentPassword,
      phoneNumber: req.body.agentMobileNumber,
      area: req.body.assignedBranch,
      assignedBranch: req.body.assignedBranch,
      vehicleType: req.body.vehicleType,
      vehicleNumber: req.body.vehicleNumber || '',
      licenseNumber: req.body.licenseNumber || '',
      workingHours: req.body.workingHours || { startTime: '09:00', endTime: '18:00' },
      workingDays: req.body.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      status: 'active',
      isAvailable: true
    };

    const newAgent = new DeliveryAgent(agentData);
    await newAgent.save();

    const agentResponse = await DeliveryAgent.findById(newAgent._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Delivery agent created successfully',
      data: agentResponse
    });
  } catch (error) {
    console.error('Error creating delivery agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery agent'
    });
  }
});

// Update delivery agent
router.put('/delivery-agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove sensitive fields from update
    delete updateData.password;
    delete updateData.agentId;

    const updatedAgent = await DeliveryAgent.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedAgent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Delivery agent updated successfully',
      data: updatedAgent
    });
  } catch (error) {
    console.error('Error updating delivery agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery agent'
    });
  }
});

// Delete delivery agent
router.delete('/delivery-agents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAgent = await DeliveryAgent.findByIdAndDelete(id);

    if (!deletedAgent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Delivery agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting delivery agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete delivery agent'
    });
  }
});

// Get delivery agent statistics
router.get('/delivery-agents/stats', async (req, res) => {
  try {
    const [
      totalAgents,
      activeAgents,
      availableAgents
    ] = await Promise.all([
      DeliveryAgent.countDocuments(),
      DeliveryAgent.countDocuments({ status: 'active' }),
      DeliveryAgent.countDocuments({ isAvailable: true })
    ]);

    res.json({
      success: true,
      data: {
        totalAgents,
        activeAgents,
        availableAgents,
        inactiveAgents: totalAgents - activeAgents
      }
    });
  } catch (error) {
    console.error('Error fetching delivery agent stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery agent statistics'
    });
  }
});

// === DASHBOARD ROUTES ===
router.get('/dashboard', async (req, res) => {
  try {
    const [courierStats, branchStats, agentStats, complaintStats] = await Promise.all([
      Promise.all([
        Courier.countDocuments(),
        Courier.countDocuments({ status: 'Delivered' }),
        Courier.countDocuments({ status: { $in: ['Shipped', 'Intransit', 'Out for Delivery'] } }),
        Courier.countDocuments({ status: { $in: ['Pickup Failed', 'Delivery Failed'] } })
      ]),
      Promise.all([
        Branch.countDocuments({ status: 'active' }),
        Branch.countDocuments()
      ]),
      Promise.all([
        DeliveryAgent.countDocuments({ status: 'active' }),
        DeliveryAgent.countDocuments({ isAvailable: true })
      ]),
      Promise.all([
        Complaint.countDocuments({ status: 'open' }),
        Complaint.countDocuments()
      ])
    ]);

    const [totalCouriers, deliveredCouriers, inTransitCouriers, failedCouriers] = courierStats;
    const [activeBranches, totalBranches] = branchStats;
    const [activeAgents, availableAgents] = agentStats;
    const [openComplaints, totalComplaints] = complaintStats;

    res.json({
      success: true,
      data: {
        overview: {
          couriers: {
            total: totalCouriers,
            delivered: deliveredCouriers,
            inTransit: inTransitCouriers,
            failed: failedCouriers,
            successRate: totalCouriers > 0 ? ((deliveredCouriers / totalCouriers) * 100).toFixed(1) : 0
          },
          branches: { total: totalBranches, active: activeBranches },
          agents: { total: activeAgents, available: availableAgents },
          complaints: { total: totalComplaints, open: openComplaints }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// Dashboard stats endpoint for analytics
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Import Booking model for complete data
    const Booking = require('../models/Booking');
    
    const [courierStats, bookingStats, agentStats, complaintStats, queryStats, todayDeliveries, todayBookingDeliveries] = await Promise.all([
      Courier.countDocuments(),
      Booking.countDocuments(),
      DeliveryAgent.countDocuments({ status: 'active' }),
      Complaint.countDocuments(),
      Contact.countDocuments(),
      Courier.countDocuments({
        status: 'Delivered',
        actualDeliveryDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      }),
      Booking.countDocuments({
        status: 'delivered',
        actualDeliveryDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      })
    ]);

    // Combine courier and booking counts for total system data
    const totalCouriers = courierStats + bookingStats;
    const totalTodayDeliveries = todayDeliveries + todayBookingDeliveries;

    console.log('Dashboard Stats:', {
      legacyCouriers: courierStats,
      newBookings: bookingStats,
      totalCouriers,
      totalTodayDeliveries
    });

    res.json({
      success: true,
      data: {
        totalCouriers,
        totalAgents: agentStats,
        totalComplaints: complaintStats,
        totalQueries: queryStats,
        todayDeliveries: totalTodayDeliveries
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// Basic stats endpoint for simplified analytics
router.get('/basic-stats', async (req, res) => {
  try {
    const stats = await analyticsService.getBasicStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Basic stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch basic statistics' });
  }
});

// Simple revenue endpoint
router.get('/revenue', async (req, res) => {
  try {
    const revenue = await analyticsService.getSimpleRevenue();
    res.json({ success: true, data: revenue });
  } catch (error) {
    console.error('Revenue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue data' });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

// Get all users with pagination and filtering
router.get('/users', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = '', 
      authProvider = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query object
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.isActive = status === 'active';
    }
    
    if (authProvider) {
      query.authProvider = authProvider;
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password') // Exclude password field
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalUsers / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get user statistics
router.get('/users/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      usersByProvider
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }),
      User.aggregate([
        {
          $group: {
            _id: '$authProvider',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        newUsersThisMonth,
        usersByProvider: usersByProvider.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// Get single user details
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's courier history count
    const courierCount = await Courier.countDocuments({ userId });
    
    // Get user's complaint count
    const complaintCount = await Complaint.countDocuments({ 
      'customerInfo.email': user.email
    });

    res.json({
      success: true,
      data: {
        ...user,
        courierCount,
        complaintCount
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
});

// Update user status (activate/deactivate)
router.put('/users/:userId/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
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

    const { userId } = req.params;
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// Get user's courier history
router.get('/users/:userId/couriers', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const couriers = await Courier.find({ userId })
      .populate('assignedAgent', 'agentName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const totalCouriers = await Courier.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        couriers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCouriers / limit),
          totalCouriers,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user couriers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user courier history'
    });
  }
});

// Get user's complaint history
router.get('/users/:userId/complaints', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find complaints by matching customerInfo.email with user's email
    const complaints = await Complaint.find({ 'customerInfo.email': user.email })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const totalComplaints = await Complaint.countDocuments({ 'customerInfo.email': user.email });

    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalComplaints / limit),
          totalComplaints,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user complaint history'
    });
  }
});

// Delete user (admin only - soft delete by deactivating)
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user has active couriers
    const activeCouriers = await Courier.countDocuments({
      userId,
      status: { $nin: ['Delivered', 'Cancelled'] }
    });
    
    if (activeCouriers > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user with ${activeCouriers} active courier(s). Please complete or cancel active deliveries first.`
      });
    }
    
    // Soft delete by deactivating
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// === QUERY/CONTACT MANAGEMENT ROUTES ===

// Get all contact queries with filtering and pagination
router.get('/queries', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      if (status === 'unread') filter.isRead = 0;
      if (status === 'read') filter.isRead = 1;
      if (status === 'replied') filter.reply = { $exists: true, $ne: null };
      if (status === 'pending') {
        filter.$and = [
          { isRead: 1 },
          { $or: [{ reply: { $exists: false } }, { reply: null }] }
        ];
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [data, total] = await Promise.all([
      Contact.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Contact.countDocuments(filter)
    ]);

    // Calculate stats
    const [totalQueries, unreadCount, repliedCount] = await Promise.all([
      Contact.countDocuments(),
      Contact.countDocuments({ isRead: 0 }),
      Contact.countDocuments({ reply: { $exists: true, $ne: null } })
    ]);

    const pendingCount = await Contact.countDocuments({
      isRead: 1,
      $or: [{ reply: { $exists: false } }, { reply: null }]
    });

    // Format data for frontend
    const formattedData = data.map(item => ({
      _id: item._id,
      name: item.name,
      email: item.email,
      phone: item.mobileNumber,
      subject: 'General Inquiry', // Default subject since Contact model doesn't have it
      message: item.message,
      status: item.reply ? 'replied' : (item.isRead === 1 ? 'pending' : 'unread'),
      reply: item.reply,
      repliedAt: item.repliedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      stats: {
        total: totalQueries,
        unread: unreadCount,
        replied: repliedCount,
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queries'
    });
  }
});

// Mark query as read
router.patch('/queries/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndUpdate(
      id,
      { isRead: 1 },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    res.json({
      success: true,
      message: 'Query marked as read',
      data: contact
    });
  } catch (error) {
    console.error('Error marking query as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark query as read'
    });
  }
});

// Reply to a query
router.post('/queries/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required'
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      { 
        reply: replyMessage.trim(),
        repliedAt: new Date(),
        isRead: 1
      },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Here you could add email sending functionality
    // For now, we'll just update the database
    
    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply'
    });
  }
});

module.exports = router; 