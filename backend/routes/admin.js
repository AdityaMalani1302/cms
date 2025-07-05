const express = require('express');
const { createGenericRoutes } = require('../controllers/genericController');
const { authAdmin } = require('../middleware/auth');

// Import models
const Courier = require('../models/Courier');
const Branch = require('../models/Branch');
const DeliveryAgent = require('../models/DeliveryAgent');
const Complaint = require('../models/Complaint');
const Contact = require('../models/Contact');

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
const agentRoutes = require('./deliveryAgent');
const complaintRoutes = require('./complaints');
const contactRoutes = require('./contact');

// Apply admin authentication to all routes
router.use(authAdmin);

// === ADMIN PROFILE ROUTES ===
router.get('/profile', async (req, res) => {
  try {
    const admin = req.user; // From auth middleware
    
    res.json({
      success: true,
      data: {
        id: admin._id,
        adminName: admin.adminName,
        email: admin.email,
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
router.put('/complaints/:id', complaintCRUD.update);
router.delete('/complaints/:id', complaintCRUD.delete);

// Mount route groups
router.use('/couriers', courierRoutes);
router.use('/branches', branchRoutes);
router.use('/delivery-agents', agentRoutes);
router.use('/contacts', contactRoutes);

// === DELIVERY AGENT SPECIFIC ROUTES ===
// Get delivery agent statistics
router.get('/delivery-agents/stats', async (req, res) => {
  try {
    const [totalAgents, activeAgents, totalDeliveries, agents] = await Promise.all([
      DeliveryAgent.countDocuments(),
      DeliveryAgent.countDocuments({ status: 'active' }),
      Courier.countDocuments({ assignedAgent: { $ne: null } }),
      DeliveryAgent.find().select('averageRating')
    ]);

    // Calculate average rating across all agents
    const avgRating = agents.reduce((sum, agent) => sum + (agent.averageRating || 0), 0) / (agents.length || 1);

    res.json({
      success: true,
      data: {
        totalAgents,
        activeAgents,
        totalDeliveries,
        avgRating: avgRating.toFixed(1)
      }
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get agent performance data
router.get('/delivery-agents/:agentId/performance', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await DeliveryAgent.findById(agentId);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const [totalDeliveries, successfulDeliveries, failedDeliveries, todayDeliveries, recentDeliveries] = await Promise.all([
      Courier.countDocuments({ assignedAgent: agentId }),
      Courier.countDocuments({ assignedAgent: agentId, status: 'Delivered' }),
      Courier.countDocuments({ assignedAgent: agentId, status: { $in: ['Pickup Failed', 'Delivery Failed'] } }),
      Courier.countDocuments({
        assignedAgent: agentId,
        status: 'Delivered',
        actualDeliveryDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      }),
      Courier.find({ assignedAgent: agentId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('refNumber recipientName status expectedDeliveryDate actualDeliveryDate')
    ]);

    const successRate = totalDeliveries > 0 ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        agent: {
          id: agent._id,
          name: agent.agentName,
          email: agent.agentEmail,
          branch: agent.assignedBranch,
          vehicleType: agent.vehicleType,
          averageRating: agent.averageRating
        },
        performance: {
          totalDeliveries,
          successfulDeliveries,
          failedDeliveries,
          todayDeliveries,
          successRate
        },
        recentDeliveries
      }
    });
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get agent consignments
router.get('/delivery-agents/:agentId/consignments', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const agent = await DeliveryAgent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    let filter = { assignedAgent: agentId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [consignments, total] = await Promise.all([
      Courier.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('refNumber senderName recipientName status expectedDeliveryDate actualDeliveryDate createdAt')
        .populate('assignedAgent', 'agentName'),
      Courier.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        consignments,
        agent: {
          name: agent.agentName,
          email: agent.agentEmail,
          branch: agent.assignedBranch
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching agent consignments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all agents performance overview
router.get('/delivery-agents/performance-overview', async (req, res) => {
  try {
    const agents = await DeliveryAgent.aggregate([
      {
        $lookup: {
          from: 'couriers',
          localField: '_id',
          foreignField: 'assignedAgent',
          as: 'allDeliveries'
        }
      },
      {
        $lookup: {
          from: 'couriers',
          let: { agentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assignedAgent', '$$agentId'] },
                    { $eq: ['$status', 'Delivered'] }
                  ]
                }
              }
            }
          ],
          as: 'successfulDeliveries'
        }
      },
      {
        $lookup: {
          from: 'couriers',
          let: { agentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assignedAgent', '$$agentId'] },
                    {
                      $in: ['$status', ['Pickup Failed', 'Delivery Failed']]
                    }
                  ]
                }
              }
            }
          ],
          as: 'failedDeliveries'
        }
      },
      {
        $project: {
          agentId: 1,
          agentName: 1,
          agentEmail: 1,
          assignedBranch: 1,
          vehicleType: 1,
          status: 1,
          isAvailable: 1,
          averageRating: 1,
          totalDeliveries: { $size: '$allDeliveries' },
          successfulDeliveries: { $size: '$successfulDeliveries' },
          failedDeliveries: { $size: '$failedDeliveries' },
          successRate: {
            $cond: {
              if: { $eq: [{ $size: '$allDeliveries' }, 0] },
              then: 0,
              else: {
                $multiply: [
                  { $divide: [{ $size: '$successfulDeliveries' }, { $size: '$allDeliveries' }] },
                  100
                ]
              }
            }
          }
        }
      },
      {
        $sort: { totalDeliveries: -1 }
      }
    ]);

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Error fetching agents performance overview:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update agent status
router.patch('/delivery-agents/:agentId/status', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'on_leave'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, inactive, on_leave'
      });
    }

    const agent = await DeliveryAgent.findByIdAndUpdate(
      agentId,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: agent,
      message: 'Agent status updated successfully'
    });
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update agent availability
router.patch('/delivery-agents/:agentId/availability', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { isAvailable } = req.body;

    const agent = await DeliveryAgent.findByIdAndUpdate(
      agentId,
      { isAvailable, updatedAt: new Date() },
      { new: true }
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: agent,
      message: 'Agent availability updated successfully'
    });
  } catch (error) {
    console.error('Error updating agent availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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
    const [courierStats, agentStats, complaintStats, todayDeliveries] = await Promise.all([
      Courier.countDocuments(),
      DeliveryAgent.countDocuments({ status: 'active' }),
      Complaint.countDocuments(),
      Courier.countDocuments({
        status: 'Delivered',
        actualDeliveryDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalCouriers: courierStats,
        totalAgents: agentStats,
        totalComplaints: complaintStats,
        todayDeliveries: todayDeliveries
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// Analytics endpoint
router.get('/analytics', async (req, res) => {
  try {
    const { dateRange = 'month' } = req.query;
    
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const query = { createdAt: { $gte: startDate } };

    const [totalDeliveries, successfulDeliveries, topAgents] = await Promise.all([
      Courier.countDocuments(query),
      Courier.countDocuments({ ...query, status: 'Delivered' }),
      DeliveryAgent.aggregate([
        {
          $lookup: {
            from: 'couriers',
            localField: '_id',
            foreignField: 'assignedAgent',
            as: 'deliveries'
          }
        },
        {
          $project: {
            agentName: 1,
            deliveries: { $size: '$deliveries' },
            successRate: { $multiply: [{ $divide: [{ $size: '$deliveries' }, { $add: [{ $size: '$deliveries' }, 1] }] }, 100] }
          }
        },
        { $sort: { deliveries: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        overview: { totalDeliveries, successfulDeliveries },
        performance: { topAgents }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }
});

module.exports = router; 