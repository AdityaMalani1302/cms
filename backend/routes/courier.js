const express = require('express');
const { createGenericRoutes } = require('../controllers/genericController');
const Courier = require('../models/Courier');
const CourierTracking = require('../models/CourierTracking');
const { auth, authAdmin } = require('../middleware/auth');
const { courierConfig } = require('../config/routeConfigs');

const router = express.Router();

// Use generic controller for CRUD operations
const courierRoutes = createGenericRoutes({
  model: Courier,
  config: courierConfig,
  customLogic: {
    // Custom logic for courier creation
    afterCreate: async (courier, req) => {
      try {
        // Create initial tracking entry
        const initialTracking = new CourierTracking({
          courierId: courier._id,
          remark: 'Courier registered',
          status: 'Courier Pickup'
        });
        await initialTracking.save();
        console.log('✅ Created initial tracking for courier:', courier.refNumber);
      } catch (error) {
        console.error('❌ Error creating initial tracking:', error);
        // Don't throw error here as courier is already created
      }
    },

    // Custom statistics calculation
    onStats: async () => {
      const [total, inTransit, delivered, pickup, failed] = await Promise.all([
        Courier.countDocuments(),
        Courier.countDocuments({ 
          status: { $in: ['Shipped', 'Intransit', 'Arrived at Destination', 'Out for Delivery'] } 
        }),
        Courier.countDocuments({ status: 'Delivered' }),
        Courier.countDocuments({ status: 'Courier Pickup' }),
        Courier.countDocuments({ status: { $in: ['Pickup Failed', 'Delivery Failed'] } })
      ]);

      return { total, inTransit, delivered, pickup, failed };
    }
  }
});

// Apply generic routes
router.use('/', courierRoutes);

// Custom route for tracking
router.get('/:id/tracking', auth, async (req, res) => {
  try {
    const tracking = await CourierTracking.find({ courierId: req.params.id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: tracking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/courier/:id
// @desc    Delete courier (Admin only)
// @access  Private (Admin only)
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid courier ID format'
      });
    }

    const courier = await Courier.findById(req.params.id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }

    // Delete associated tracking records
    await CourierTracking.deleteMany({ courierId: courier._id });
    
    // Delete courier
    await Courier.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Courier deleted successfully'
    });
  } catch (error) {
    console.error('Delete courier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/pending', async (req, res) => {
  try {
    console.log('🔍 Admin fetching pending couriers...');
    const Booking = require('../models/Booking');
    
    const pendingCouriers = await Booking.find({
      status: 'Pending Pickup',
      assignedAgent: { $exists: false }
    })
    .populate('userId', 'name email phoneNumber')
    .select('trackingId pickupAddress deliveryAddress packageType weight estimatedCost status createdAt userId description')
    .sort({ createdAt: -1 });

    console.log(`📦 Found ${pendingCouriers.length} pending couriers for allocation`);

    // Transform data to match frontend expectations
    const transformedCouriers = pendingCouriers.map(booking => ({
      _id: booking._id,
      refNumber: booking.trackingId,
      senderAddress: `${booking.pickupAddress?.street || 'N/A'}, ${booking.pickupAddress?.city || 'N/A'}`,
      senderCity: booking.pickupAddress?.city || 'N/A',
      recipientName: booking.userId?.name || 'Unknown',
      recipientAddress: `${booking.deliveryAddress?.street || 'N/A'}, ${booking.deliveryAddress?.city || 'N/A'}`,
      recipientCity: booking.deliveryAddress?.city || 'N/A',
      courierDescription: booking.description || booking.packageType,
      parcelWeight: booking.weight,
      status: booking.status,
      createdAt: booking.createdAt,
      estimatedCost: booking.estimatedCost
    }));

    res.json({
      success: true,
      couriers: transformedCouriers
    });
  } catch (error) {
    console.error('❌ Error fetching pending couriers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending couriers',
      error: error.message
    });
  }
});

module.exports = router; 