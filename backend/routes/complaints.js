const express = require('express');
const { createGenericCRUD } = require('../controllers/genericController');
const Complaint = require('../models/Complaint');
const Courier = require('../models/Courier');
const Booking = require('../models/Booking');
const { authAdmin } = require('../middleware/auth');
const { complaintConfig } = require('../config/routeConfigs');
const NotificationService = require('../services/notificationService');

const router = express.Router();

// Create custom admin routes WITHOUT create operation
const createAdminComplaintRoutes = () => {
  const adminRouter = express.Router();
  
  // Use generic CRUD but exclude create operation
  const crud = createGenericCRUD(Complaint, complaintConfig);
  
  // Define routes - excluding POST (create)
  adminRouter.get('/', crud.getAll);
  adminRouter.get('/stats', crud.getStats);
  adminRouter.get('/:id', crud.getById);
  adminRouter.put('/:id', crud.update);
  adminRouter.delete('/:id', crud.delete);
  
  return adminRouter;
};

// Apply custom admin routes (without create functionality)
router.use('/admin', authAdmin, createAdminComplaintRoutes());

// Custom public routes for complaint submission and tracking
router.post('/', async (req, res) => {
  try {
    console.log('📋 Complaint submission request:', req.body);
    
    const { 
      trackingNumber, 
      customerInfo, 
      complaintCategory, 
      priority, 
      natureOfComplaint 
    } = req.body;

    // Validate required fields
    if (!trackingNumber || !natureOfComplaint) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: trackingNumber, natureOfComplaint'
      });
    }

    // Validate customer info
    if (!customerInfo || !customerInfo.name || !customerInfo.email) {
      console.log('❌ Missing customer info');
      return res.status(400).json({
        success: false,
        message: 'Customer information (name, email) is required'
      });
    }

    // Validate complaint category
    if (!complaintCategory) {
      console.log('❌ Missing complaint category');
      return res.status(400).json({
        success: false,
        message: 'Complaint category is required'
      });
    }
    
    console.log('🔍 Checking tracking number in database...');
    
    // Check if tracking number exists (either in Courier or Booking)
    const [courier, booking] = await Promise.all([
      Courier.findOne({ refNumber: trackingNumber }).catch(err => {
        console.error('❌ Courier lookup error:', err.message);
        return null;
      }),
      Booking.findOne({ trackingId: trackingNumber }).catch(err => {
        console.error('❌ Booking lookup error:', err.message);
        return null;
      })
    ]);
    
    console.log('🔍 Search results - Courier:', !!courier, 'Booking:', !!booking);
    
    if (!courier && !booking) {
      console.log('❌ Tracking number not found:', trackingNumber);
      return res.status(404).json({
        success: false,
        message: 'Invalid tracking number. Please check your tracking/reference number and try again.'
      });
    }

    console.log('✅ Tracking number found, creating complaint...');
    
    // Transaction helper removed
    
    const complaintData = {
      trackingNumber,
      customerInfo: {
        name: customerInfo.name,
        email: customerInfo.email,
        contactNumber: customerInfo.contactNumber || '0000000000'
      },
      complaintCategory,
      priority: priority || 'Medium',
      natureOfComplaint,
      issueDescription: natureOfComplaint, // Use natureOfComplaint as description
      bookingId: booking?._id // Link to booking if found
    };

    console.log('💾 Creating complaint...');
    
    // Create complaint directly without transaction for development
    const Complaint = require('../models/Complaint');
    const complaint = await Complaint.create(complaintData);
    console.log('✅ Complaint created successfully:', complaint.ticketNumber);
    
    // Update related booking if exists (non-transactional)
    if (booking) {
      try {
        const Booking = require('../models/Booking');
        await Booking.findByIdAndUpdate(
          booking._id,
          { 
            hasComplaint: true,
            complaintId: complaint._id
          }
        );
        console.log('📝 Updated booking with complaint reference');
      } catch (error) {
        console.warn('⚠️ Failed to update booking:', error.message);
      }
    }

    // Create notification for complaint
    try {
      // Find user by email to create notification
      const user = await NotificationService.findUserByEmail(customerInfo.email);
      if (user) {
        await NotificationService.createComplaintNotification(user._id, complaint);
        console.log('✅ Complaint notification created');
      } else {
        console.log('⚠️ User not found for notification:', customerInfo.email);
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to create complaint notification:', notificationError);
      // Continue even if notification creation fails
    }

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: {
        ticketNumber: complaint.ticketNumber,
        trackingNumber: complaint.trackingNumber,
        status: complaint.status,
        priority: complaint.priority,
        createdAt: complaint.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Complaint creation error details:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message
      });
    } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: 'Database error. Please try again later.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Server error while submitting complaint. Please try again.'
      });
    }
  }
});

// Public tracking route
router.get('/track/:ticketNumber', async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ ticketNumber: req.params.ticketNumber });
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Invalid ticket number'
      });
    }

    res.json({
      success: true,
      data: {
        ticketNumber: complaint.ticketNumber,
        trackingNumber: complaint.trackingNumber,
        complaintCategory: complaint.complaintCategory,
        natureOfComplaint: complaint.natureOfComplaint,
        issueDescription: complaint.issueDescription,
        status: complaint.status,
        priority: complaint.priority,
        remark: complaint.remark,
        communicationHistory: complaint.communicationHistory.filter(comm => !comm.isInternal),
        createdAt: complaint.createdAt,
        updationDate: complaint.updationDate,
        // Add real-time indicator
        lastChecked: new Date(),
        hasAdminResponse: !!complaint.remark || (complaint.communicationHistory && complaint.communicationHistory.some(comm => comm.type === 'Admin Response' && !comm.isInternal))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's complaints by email
router.get('/my/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const complaints = await Complaint.find({ 
      'customerInfo.email': email.toLowerCase() 
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('ticketNumber trackingNumber complaintCategory status priority natureOfComplaint createdAt');

    res.json({
      success: true,
      complaints: complaints,
      total: complaints.length
    });
  } catch (error) {
    console.error('Error fetching user complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's complaints with admin responses
router.get('/my/:email/with-responses', async (req, res) => {
  try {
    const { email } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find complaints with admin responses (In Progress status usually indicates admin has responded)
    const complaints = await Complaint.find({ 
      'customerInfo.email': email.toLowerCase(),
      status: 'In Progress',
      $or: [
        { 'communicationHistory.type': 'Admin Response' },
        { remark: { $exists: true, $ne: '' } }
      ]
    })
    .sort({ updationDate: -1 })
    .limit(limit)
    .select('ticketNumber trackingNumber complaintCategory status priority natureOfComplaint issueDescription communicationHistory remark createdAt updationDate');

    // Filter and format the response data
    const formattedComplaints = complaints.map(complaint => {
      const adminResponses = complaint.communicationHistory ? 
        complaint.communicationHistory.filter(comm => comm.type === 'Admin Response' && !comm.isInternal) : [];
      
      return {
        ticketNumber: complaint.ticketNumber,
        trackingNumber: complaint.trackingNumber,
        complaintCategory: complaint.complaintCategory,
        status: complaint.status,
        priority: complaint.priority,
        natureOfComplaint: complaint.natureOfComplaint,
        issueDescription: complaint.issueDescription,
        remark: complaint.remark,
        createdAt: complaint.createdAt,
        updationDate: complaint.updationDate,
        adminResponses: adminResponses,
        hasAdminResponse: adminResponses.length > 0 || !!complaint.remark
      };
    }).filter(complaint => complaint.hasAdminResponse);

    res.json({
      success: true,
      complaints: formattedComplaints,
      count: formattedComplaints.length
    });
  } catch (error) {
    console.error('Error fetching complaints with responses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 