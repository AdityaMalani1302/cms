const express = require('express');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Courier = require('../models/Courier');
const CourierTracking = require('../models/CourierTracking');
const moment = require('moment');

const router = express.Router();

// Enhanced utility function to format booking data (Amazon-style)
const formatEnhancedBookingData = (booking) => {
  const timeline = booking.statusHistory || [];
  
  // Sort timeline by timestamp (newest first for display)
  const sortedTimeline = [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Get current status info
  const currentStatus = booking.status;
  const isDelivered = currentStatus === 'delivered';
  const isOutForDelivery = currentStatus === 'out for delivery';
  const isInTransit = ['shipped', 'in transit', 'arrived at destination'].includes(currentStatus);
  
  // Format timeline for display
  const formattedTimeline = sortedTimeline.map(item => ({
    status: item.status,
    timestamp: item.timestamp,
    date: moment(item.timestamp).format('dddd, MMMM D'),
    time: moment(item.timestamp).format('h:mm A'),
    location: item.location || booking.deliveryAddress.city,
    description: item.notes || `Status updated to ${item.status}`,
    isCompleted: true,
    agentName: item.agentName || 'System',
    relativeTime: moment(item.timestamp).fromNow()
  }));

  // Add future status if not delivered
  if (!isDelivered) {
    const futureStatus = getFutureStatus(currentStatus);
    if (futureStatus) {
      formattedTimeline.unshift({
        status: futureStatus.status,
        description: futureStatus.description,
        isCompleted: false,
        isFuture: true,
        estimatedTime: booking.estimatedDelivery || 'Processing'
      });
    }
  }

  return {
    success: true,
    trackingInfo: {
      refNumber: booking.trackingId,
      currentStatus: currentStatus,
      estimatedDelivery: booking.expectedDeliveryDate ? moment(booking.expectedDeliveryDate).format('dddd, MMMM D') : 'Processing',
      isDelivered,
      isOutForDelivery,
      isInTransit,
      orderDate: moment(booking.createdAt).format('dddd, MMMM D'),
      packageInfo: {
        description: booking.description || booking.packageType || 'Package',
        weight: booking.weight ? `${booking.weight} kg` : 'N/A',
        dimensions: 'N/A', // Booking model doesn't have dimensions
        value: booking.estimatedCost ? `₹${booking.estimatedCost}` : 'N/A'
      },
      sender: {
        name: 'Sender', // Booking model doesn't store sender name
        city: booking.pickupAddress.city,
        state: booking.pickupAddress.state,
        pincode: booking.pickupAddress.pincode
      },
      recipient: {
        name: booking.recipientName,
        address: `${booking.deliveryAddress.street}`,
        city: booking.deliveryAddress.city,
        state: booking.deliveryAddress.state,
        pincode: booking.deliveryAddress.pincode
      },
      timeline: formattedTimeline,
      shippingMethod: getShippingMethod(booking),
      trackingId: booking.trackingId,
      nextUpdate: getNextUpdate(currentStatus)
    }
  };
};

// Get future status for timeline
const getFutureStatus = (currentStatus) => {
  const statusFlow = {
    'pending pickup': { 
      status: 'picked up', 
      description: 'Package will be picked up' 
    },
    'picked up': { 
      status: 'shipped', 
      description: 'Package will be shipped' 
    },
    'shipped': { 
      status: 'in transit', 
      description: 'Package will be in transit' 
    },
    'in transit': { 
      status: 'arrived at destination', 
      description: 'Package will arrive at destination' 
    },
    'arrived at destination': { 
      status: 'out for delivery', 
      description: 'Package will be out for delivery' 
    },
    'out for delivery': { 
      status: 'delivered', 
      description: 'Package will be delivered' 
    }
  };

  return statusFlow[currentStatus] || null;
};

// Get shipping method info
const getShippingMethod = (courier) => {
  // You can enhance this based on your business logic
  return {
    name: 'Standard Delivery',
    carrier: 'CMS Express',
    service: 'Door-to-Door Delivery'
  };
};

// Get next update info
const getNextUpdate = (status) => {
  const updates = {
    'pending pickup': 'Next update when package is picked up',
    'picked up': 'Next update when package is shipped',
    'shipped': 'Next update when package is in transit',
    'in transit': 'Next update when package arrives at destination',
    'arrived at destination': 'Next update when package is out for delivery',
    'out for delivery': 'Next update when package is delivered',
    'delivered': 'Package delivered - no further updates',
    'pickup failed': 'Please contact support for assistance',
    'delivery failed': 'Delivery will be attempted again'
  };

  return updates[status] || 'Processing your request';
};

// Legacy format for backward compatibility
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

// Enhanced tracking function for Booking model
const getEnhancedTrackingData = async (trackingId) => {
  const booking = await Booking.findOne({ trackingId: trackingId.trim() })
    .populate('assignedAgent', 'agentName')
    .populate('userId', 'name email');
  
  if (!booking) {
    // Fallback to Courier model for backward compatibility
    const courier = await Courier.findOne({ refNumber: trackingId.trim() })
      .populate('assignedAgent', 'agentName')
      .populate('userId', 'name email');
    
    if (!courier) {
      return null;
    }
    
    return formatEnhancedCourierData(courier);
  }

  return formatEnhancedBookingData(booking);
};

// Keep the old courier formatting for backward compatibility
const formatEnhancedCourierData = (courier) => {
  const timeline = courier.trackingHistory || [];
  
  // Sort timeline by timestamp (newest first for display)
  const sortedTimeline = [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Get current status info
  const currentStatus = courier.status || 'pending pickup';
  const isDelivered = currentStatus === 'delivered' || currentStatus === 'Delivered';
  const isOutForDelivery = currentStatus === 'out for delivery' || currentStatus === 'Out for Delivery';
  const isInTransit = ['shipped', 'in transit', 'arrived at destination', 'Shipped', 'Intransit', 'Arrived at Destination'].includes(currentStatus);
  
  // Format timeline for display
  const formattedTimeline = sortedTimeline.map(item => ({
    status: item.status,
    timestamp: item.timestamp,
    date: moment(item.timestamp).format('dddd, MMMM D'),
    time: moment(item.timestamp).format('h:mm A'),
    location: item.location || courier.recipientCity,
    description: item.description,
    isCompleted: true,
    agentName: item.agentName,
    relativeTime: moment(item.timestamp).fromNow()
  }));

  // Add future status if not delivered
  if (!isDelivered) {
    const futureStatus = getFutureStatus(currentStatus.toLowerCase());
    if (futureStatus) {
      formattedTimeline.unshift({
        status: futureStatus.status,
        description: futureStatus.description,
        isCompleted: false,
        isFuture: true,
        estimatedTime: courier.estimatedDeliveryTime
      });
    }
  }

  return {
    success: true,
    trackingInfo: {
      refNumber: courier.refNumber,
      currentStatus: currentStatus,
      estimatedDelivery: courier.estimatedDeliveryTime || 'Processing',
      isDelivered,
      isOutForDelivery,
      isInTransit,
      orderDate: moment(courier.createdAt).format('dddd, MMMM D'),
      packageInfo: {
        description: courier.courierDescription || 'Package',
        weight: courier.parcelWeight,
        dimensions: `${courier.parcelDimensionLength}x${courier.parcelDimensionWidth}x${courier.parcelDimensionHeight}`,
        value: courier.parcelPrice
      },
      sender: {
        name: courier.senderName,
        city: courier.senderCity,
        state: courier.senderState,
        pincode: courier.senderPincode
      },
      recipient: {
        name: courier.recipientName,
        address: courier.recipientAddress,
        city: courier.recipientCity,
        state: courier.recipientState,
        pincode: courier.recipientPincode
      },
      timeline: formattedTimeline,
      shippingMethod: getShippingMethod(courier),
      trackingId: courier.refNumber,
      nextUpdate: getNextUpdate(currentStatus.toLowerCase())
    }
  };
};

// Legacy tracking function (for backward compatibility)
const getTrackingData = async (refNumber) => {
  // Try to find in Booking model first (new system)
  const booking = await Booking.findOne({ trackingId: refNumber.trim() });
  if (booking) {
    return formatEnhancedBookingData(booking);
  }

  // Fallback to Courier model (legacy system)
  const courier = await Courier.findOne({ refNumber: refNumber.trim() });
  if (!courier) {
    return null;
  }

  const trackingHistory = await CourierTracking.find({ courierId: courier._id })
    .sort({ createdAt: 1 });

  return formatCourierData(courier, trackingHistory);
};

// Enhanced tracking endpoint (Amazon-style)
router.get('/enhanced/:refNumber', async (req, res) => {
  try {
    const data = await getEnhancedTrackingData(req.params.refNumber);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Package not found. Please check your tracking number.'
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Enhanced tracking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Unable to fetch tracking information. Please try again.' 
    });
  }
});

// Search courier by reference number (POST) - Enhanced
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

    // Use enhanced tracking for better UI
    const data = await getEnhancedTrackingData(req.body.refNumber);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Package not found. Please check your tracking number.'
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Tracking search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Unable to fetch tracking information. Please try again.' 
    });
  }
});

// Get courier tracking by reference number (GET) - Legacy support
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
    console.error('Legacy tracking error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update tracking status (for admins/agents)
router.post('/update-status', [
  body('refNumber').notEmpty().withMessage('Reference number is required'),
  body('status').notEmpty().withMessage('Status is required'),
  body('location').optional(),
  body('description').optional()
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

    const { refNumber, status, location, description, agentName } = req.body;
    
    // Try booking first (new system)
    let booking = await Booking.findOne({ trackingId: refNumber.trim() });
    if (booking) {
      // Update current location and status
      booking.status = status;
      
      // Add to status history
      if (!booking.statusHistory) booking.statusHistory = [];
      booking.statusHistory.push({
        status,
        timestamp: new Date(),
        location: location,
        notes: description || `Status updated to ${status}`
      });
      
      await booking.save();

      return res.json({
        success: true,
        message: 'Tracking status updated successfully',
        trackingInfo: formatEnhancedBookingData(booking)
      });
    }
    
    // Fallback to courier for backward compatibility
    const courier = await Courier.findOne({ refNumber: refNumber.trim() });
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Update current location and status
    courier.status = status;
    courier.currentLocation = location || courier.currentLocation;
    
    // The pre-save middleware will automatically add to tracking history
    await courier.save();

    res.json({
      success: true,
      message: 'Tracking status updated successfully',
      trackingInfo: formatEnhancedCourierData(courier)
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update tracking status' 
    });
  }
});

module.exports = router;
 