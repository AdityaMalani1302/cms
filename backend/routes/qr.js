const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { authUser, authAdmin, authDeliveryAgent, authAny } = require('../middleware/auth');
const Courier = require('../models/Courier');
const DeliveryAgent = require('../models/DeliveryAgent');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// @route   POST /api/qr/generate/:courierId
// @desc    Generate QR code for package (Enhanced version)
// @access  Private (Admin/Delivery Agent)
router.post('/generate/:courierId', authAny([authAdmin, authDeliveryAgent]), async (req, res) => {
  try {
    const { courierId } = req.params;
    const { includeAgentInfo = false, customData = {} } = req.body;
    
    // Find courier with related data
    const courier = await Courier.findById(courierId)
      .populate('assignedAgent', 'agentName agentMobileNumber')
      .populate('userId', 'name email phoneNumber');
    
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier package not found'
      });
    }

    // Generate enhanced QR code data
    const qrData = {
      id: courier._id.toString(),
      refNumber: courier.refNumber,
      trackingId: courier.trackingId,
      type: 'package_tracking',
      status: courier.status,
      customerInfo: {
        name: courier.senderName,
        phone: courier.senderMobileNumber
      },
      trackingUrl: `${process.env.FRONTEND_URL}/track/${courier.refNumber}`,
      verificationCode: courier.trackingId, // For manual entry
      generatedAt: new Date().toISOString(),
      ...customData
    };

    // Add agent info if requested and available
    if (includeAgentInfo && courier.assignedAgent) {
      qrData.agentInfo = {
        name: courier.assignedAgent.agentName,
        phone: courier.assignedAgent.agentMobileNumber
      };
    }

    // Generate QR code with enhanced options
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H', // High error correction for better scanning
      type: 'image/png',
      quality: 0.92,
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Generate unique QR code identifier
    const qrCodeId = `QR_${courier.refNumber}_${Date.now()}`;

    // Update courier with QR code information
    if (!courier.qrCode) {
      courier.qrCode = {};
    }
    
    courier.qrCode = {
      qrId: qrCodeId,
      data: qrData,
      url: qrCodeUrl,
      generatedAt: new Date(),
      scannedCount: courier.qrCode.scannedCount || 0,
      lastScanned: courier.qrCode.lastScanned || null
    };
    
    await courier.save();

    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        qrId: qrCodeId,
        qrCodeUrl,
        qrData: {
          refNumber: courier.refNumber,
          trackingId: courier.trackingId,
          trackingUrl: qrData.trackingUrl,
          verificationCode: qrData.verificationCode
        }
      }
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/qr/scan/:qrCode
// @desc    Scan QR code and get package information
// @access  Public (for basic info) / Private (for detailed info)
router.get('/scan/:qrCode', async (req, res) => {
  try {
    const { qrCode } = req.params;
    const { detailed = false } = req.query;
    
    let packageData;
    let courier;

    try {
      // Try to parse as JSON (new format)
      packageData = JSON.parse(qrCode);
    } catch (error) {
      // Handle legacy QR codes or simple tracking IDs
      packageData = { verificationCode: qrCode };
    }

    // Find courier by various identifiers
    if (packageData.id) {
      courier = await Courier.findById(packageData.id);
    } else if (packageData.refNumber) {
      courier = await Courier.findOne({ refNumber: packageData.refNumber });
    } else if (packageData.trackingId) {
      courier = await Courier.findOne({ trackingId: packageData.trackingId });
    } else {
      // Try direct tracking ID/ref number search
      courier = await Courier.findOne({
        $or: [
          { trackingId: qrCode },
          { refNumber: qrCode }
        ]
      });
    }

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
        error: 'PACKAGE_NOT_FOUND'
      });
    }

    // Update scan statistics
    if (courier.qrCode) {
      courier.qrCode.scannedCount = (courier.qrCode.scannedCount || 0) + 1;
      courier.qrCode.lastScanned = new Date();
      await courier.save();
    }

    // Prepare response data
    const responseData = {
      refNumber: courier.refNumber,
      trackingId: courier.trackingId,
      status: courier.status,
      pickupAddress: courier.pickupAddress,
      deliveryAddress: courier.deliveryAddress,
      expectedDeliveryDate: courier.expectedDeliveryDate,
      scannedAt: new Date()
    };

    // Add detailed information if requested and user is authenticated
    if (detailed && req.user) {
      responseData.detailed = {
        senderName: courier.senderName,
        senderPhone: courier.senderMobileNumber,
        recipientName: courier.recipientName,
        recipientPhone: courier.recipientMobileNumber,
        packageType: courier.packageType,
        weight: courier.weight,
        dimensions: courier.dimensions,
        specialInstructions: courier.specialInstructions,
        currentLocation: courier.currentLocation,
        statusHistory: courier.statusHistory,
        estimatedCost: courier.estimatedCost
      };

      // Add agent info if assigned
      if (courier.assignedAgent) {
        const agent = await DeliveryAgent.findById(courier.assignedAgent);
        if (agent) {
          responseData.detailed.assignedAgent = {
            name: agent.agentName,
            phone: agent.agentMobileNumber
          };
        }
      }
    }

    res.json({
      success: true,
      message: 'Package information retrieved successfully',
      data: responseData
    });
  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scan QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/qr/verify/:qrCode
// @desc    Verify QR code and update package status
// @access  Private (Delivery Agent)
router.put('/verify/:qrCode', authDeliveryAgent, async (req, res) => {
  try {
    const { qrCode } = req.params;
    const { newStatus, location, notes, verificationPhoto } = req.body;
    
    let packageData;
    let courier;

    try {
      packageData = JSON.parse(qrCode);
    } catch (error) {
      packageData = { verificationCode: qrCode };
    }

    // Find courier
    if (packageData.id) {
      courier = await Courier.findById(packageData.id);
    } else {
      courier = await Courier.findOne({
        $or: [
          { trackingId: qrCode },
          { refNumber: qrCode },
          { trackingId: packageData.verificationCode },
          { refNumber: packageData.verificationCode }
        ]
      });
    }

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Verify agent assignment
    if (courier.assignedAgent && courier.assignedAgent.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this package'
      });
    }

    // Store old status for notifications
    const oldStatus = courier.status;

    // Update package status
    if (newStatus) {
      courier.status = newStatus;
      
      // Add to status history
      courier.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        location: location || 'Unknown',
        updatedBy: req.user.id,
        notes: notes || `Status updated via QR scan`,
        verificationMethod: 'qr_scan'
      });

      // Update specific status fields
      if (newStatus === 'Picked Up') {
        courier.actualPickupDate = new Date();
      } else if (newStatus === 'Delivered') {
        courier.actualDeliveryDate = new Date();
        courier.deliveredBy = {
          agentId: req.user.id,
          agentName: req.user.agentName,
          deliveredAt: new Date()
        };
      }
    }

    // Update location if provided
    if (location) {
      courier.currentLocation = location;
    }

    // Update QR scan info
    if (courier.qrCode) {
      courier.qrCode.lastVerification = {
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        status: newStatus,
        location: location,
        notes: notes
      };
    }

    await courier.save();

    // Send notifications if status changed
    if (newStatus && newStatus !== oldStatus && courier.userId) {
      try {
        await notificationService.sendStatusUpdate(
          courier.userId,
          courier,
          oldStatus,
          newStatus,
          {
            agentPhone: req.user.agentMobileNumber,
            location: location
          }
        );
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }

    res.json({
      success: true,
      message: 'Package verified and updated successfully',
      data: {
        refNumber: courier.refNumber,
        oldStatus,
        newStatus: newStatus || oldStatus,
        location: location || courier.currentLocation,
        verifiedAt: new Date(),
        verifiedBy: req.user.agentName
      }
    });
  } catch (error) {
    console.error('QR verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/qr/manual-entry
// @desc    Manual verification for when QR scan fails
// @access  Private (Delivery Agent)
router.post('/manual-entry', authDeliveryAgent, async (req, res) => {
  try {
    const { trackingId, refNumber, verificationCode, newStatus, location, notes } = req.body;
    
    if (!trackingId && !refNumber && !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'At least one identifier (trackingId, refNumber, or verificationCode) is required'
      });
    }

    // Find courier
    const courier = await Courier.findOne({
      $or: [
        { trackingId: trackingId || verificationCode },
        { refNumber: refNumber || verificationCode }
      ]
    });

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Package not found with provided identifiers'
      });
    }

    // Same verification logic as QR scan
    const oldStatus = courier.status;

    if (newStatus) {
      courier.status = newStatus;
      
      courier.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        location: location || 'Unknown',
        updatedBy: req.user.id,
        notes: notes || `Status updated via manual entry`,
        verificationMethod: 'manual_entry'
      });

      if (newStatus === 'Picked Up') {
        courier.actualPickupDate = new Date();
      } else if (newStatus === 'Delivered') {
        courier.actualDeliveryDate = new Date();
        courier.deliveredBy = {
          agentId: req.user.id,
          agentName: req.user.agentName,
          deliveredAt: new Date()
        };
      }
    }

    if (location) {
      courier.currentLocation = location;
    }

    await courier.save();

    // Send notifications
    if (newStatus && newStatus !== oldStatus && courier.userId) {
      try {
        await notificationService.sendStatusUpdate(
          courier.userId,
          courier,
          oldStatus,
          newStatus,
          {
            agentPhone: req.user.agentMobileNumber,
            location: location
          }
        );
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
      }
    }

    res.json({
      success: true,
      message: 'Package verified manually and updated successfully',
      data: {
        refNumber: courier.refNumber,
        trackingId: courier.trackingId,
        oldStatus,
        newStatus: newStatus || oldStatus,
        location: location || courier.currentLocation,
        verifiedAt: new Date(),
        verifiedBy: req.user.agentName,
        verificationMethod: 'manual_entry'
      }
    });
  } catch (error) {
    console.error('Manual verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify package manually'
    });
  }
});

// @route   GET /api/qr/history/:courierId
// @desc    Get QR code scan history for a package
// @access  Private (Admin/Delivery Agent)
router.get('/history/:courierId', authAny([authAdmin, authDeliveryAgent]), async (req, res) => {
  try {
    const { courierId } = req.params;
    
    const courier = await Courier.findById(courierId).select('qrCode statusHistory refNumber');
    
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    const history = {
      refNumber: courier.refNumber,
      qrCode: courier.qrCode || {},
      recentActivity: courier.statusHistory
        .filter(entry => entry.verificationMethod === 'qr_scan' || entry.verificationMethod === 'manual_entry')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10) // Last 10 QR-related activities
    };

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('QR history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve QR history'
    });
  }
});

// @route   GET /api/qr/stats
// @desc    Get QR code usage statistics
// @access  Private (Admin)
router.get('/stats', authAdmin, async (req, res) => {
  try {
    const { timeRange = '30' } = req.query; // Days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Aggregate QR code statistics
    const stats = await Courier.aggregate([
      {
        $match: {
          'qrCode.generatedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalQRGenerated: { $sum: 1 },
          totalScans: { $sum: '$qrCode.scannedCount' },
          averageScansPerQR: { $avg: '$qrCode.scannedCount' },
          packagesWithQR: { $sum: { $cond: [{ $ne: ['$qrCode', null] }, 1, 0] } }
        }
      }
    ]);

    // Get status update stats via QR
    const qrUpdates = await Courier.aggregate([
      {
        $unwind: '$statusHistory'
      },
      {
        $match: {
          'statusHistory.timestamp': { $gte: startDate },
          'statusHistory.verificationMethod': { $in: ['qr_scan', 'manual_entry'] }
        }
      },
      {
        $group: {
          _id: '$statusHistory.verificationMethod',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        timeRange: `${timeRange} days`,
        overview: stats[0] || {
          totalQRGenerated: 0,
          totalScans: 0,
          averageScansPerQR: 0,
          packagesWithQR: 0
        },
        verificationMethods: qrUpdates
      }
    });
  } catch (error) {
    console.error('QR stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve QR statistics'
    });
  }
});

module.exports = router; 