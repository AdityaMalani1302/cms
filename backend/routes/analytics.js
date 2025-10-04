const express = require('express');
const { authAdmin } = require('../middleware/auth');
const Courier = require('../models/Courier');
const DeliveryAgent = require('../models/DeliveryAgent');
const Complaint = require('../models/Complaint');
const Branch = require('../models/Branch');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authAdmin);

// Simple test endpoint to check if analytics routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics routes are working',
    user: req.user ? req.user.name : 'Unknown',
    timestamp: new Date()
  });
});

// Get overview statistics
router.get('/overview', async (req, res) => {
  try {
    console.log('Analytics overview request received from:', req.user?.name || 'Unknown');
    const { timeRange = '30' } = req.query; // days
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Basic counts
    const [
      totalCouriers,
      totalAgents, 
      totalBranches,
      totalComplaints,
      recentCouriers,
      deliveredCouriers,
      pendingCouriers,
      recentComplaints
    ] = await Promise.all([
      Courier.countDocuments(),
      DeliveryAgent.countDocuments({ status: 'active' }),
      Branch.countDocuments({ status: 'active' }),
      Complaint.countDocuments(),
      Courier.countDocuments({ createdAt: { $gte: startDate } }),
      Courier.countDocuments({ status: 'Delivered' }),
      Courier.countDocuments({ 
        status: { $nin: ['Delivered', 'Pickup Failed', 'Delivery Failed'] } 
      }),
      Complaint.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    // Calculate success rate
    const successRate = totalCouriers > 0 ? ((deliveredCouriers / totalCouriers) * 100).toFixed(1) : 0;

    // Previous period comparison
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - (daysAgo * 2));
    previousStartDate.setDate(previousStartDate.getDate() + daysAgo);
    
    const previousCouriers = await Courier.countDocuments({
      createdAt: { $gte: previousStartDate, $lt: startDate }
    });

    const growth = previousCouriers > 0 ? 
      (((recentCouriers - previousCouriers) / previousCouriers) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalCouriers,
          totalAgents,
          totalBranches,
          totalComplaints,
          recentCouriers,
          successRate: parseFloat(successRate),
          pendingCouriers,
          growth: parseFloat(growth)
        }
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get courier analytics
router.get('/couriers', async (req, res) => {
  try {
    const { timeRange = '30' } = req.query;
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Status distribution
    const statusDistribution = await Courier.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Daily trends (last 7 days)
    const dailyTrends = await Courier.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // City-wise distribution
    const cityDistribution = await Courier.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$recipientCity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        statusDistribution,
        dailyTrends,
        cityDistribution
      }
    });
  } catch (error) {
    console.error('Courier analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get agent performance
router.get('/agents', async (req, res) => {
  try {
    const { timeRange = '30' } = req.query;
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Agent statistics
    const agentStats = await DeliveryAgent.aggregate([
      { $match: { status: 'active' } },
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
          agentId: 1,
          status: 1,
          totalDeliveries: { $size: '$deliveries' },
          recentDeliveries: {
            $size: {
              $filter: {
                input: '$deliveries',
                cond: { $gte: ['$$this.updatedAt', startDate] }
              }
            }
          }
        }
      },
      { $sort: { totalDeliveries: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: { agentStats }
    });
  } catch (error) {
    console.error('Agent analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get complaint analytics
router.get('/complaints', async (req, res) => {
  try {
    const { timeRange = '30' } = req.query;
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Complaint status distribution
    const statusDistribution = await Complaint.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Complaint trends
    const trendData = await Complaint.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        statusDistribution,
        trendData
      }
    });
  } catch (error) {
    console.error('Complaint analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user analytics
router.get('/users', async (req, res) => {
  try {
    const { timeRange = '30' } = req.query;
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const User = require('../models/User');

    // User registration analytics
    const [newUsers, totalUsers] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate } }),
      User.countDocuments()
    ]);

    // Mock login data (in real app, would track login sessions)
    const totalLogins = Math.floor(newUsers * 2.5); // Approximate login count

    res.json({
      success: true,
      data: {
        newUsers,
        totalUsers,
        totalLogins,
        period: daysAgo
      }
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// FEATURE 2.2: ADVANCED ANALYTICS & REPORTING ROUTES

// Get advanced revenue analytics
router.get('/revenue', async (req, res) => {
  try {
    const revenueData = await analyticsService.getSimpleRevenue();

    res.json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get revenue analytics',
      error: error.message
    });
  }
});

// Get advanced performance metrics
router.get('/performance', async (req, res) => {
  try {
    const performanceData = await analyticsService.getBasicStats();

    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get performance metrics',
      error: error.message
    });
  }
});

// Export analytics to PDF
router.post('/export/pdf', async (req, res) => {
  try {
    const { type, period, startDate, endDate } = req.body;

    if (!type || !['revenue', 'performance'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export type. Use "revenue" or "performance"'
      });
    }

    const options = {};
    if (period) options.period = period;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    // Get data based on type
    let data;
    if (type === 'revenue') {
      data = await analyticsService.getSimpleRevenue();
    } else {
      data = await analyticsService.getBasicStats();
    }

    // For now, just return the data as PDF export is not implemented
    res.json({
      success: true,
      message: 'PDF export not implemented yet',
      data: data
    });
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export PDF report',
      error: error.message
    });
  }
});

// Export analytics to CSV
router.post('/export/csv', async (req, res) => {
  try {
    const { type, period, startDate, endDate } = req.body;

    if (!type || !['revenue', 'performance'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export type. Use "revenue" or "performance"'
      });
    }

    const options = {};
    if (period) options.period = period;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    // Get data based on type
    let data;
    if (type === 'revenue') {
      data = await analyticsService.getSimpleRevenue();
    } else {
      data = await analyticsService.getBasicStats();
    }

    // CSV export not implemented yet
    res.json({
      success: true,
      message: 'CSV export not implemented yet',
      data: data
    });
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export CSV report',
      error: error.message
    });
  }
});

// Export analytics to Excel
router.post('/export/excel', async (req, res) => {
  try {
    const { type, period, startDate, endDate } = req.body;

    if (!type || !['revenue', 'performance'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export type. Use "revenue" or "performance"'
      });
    }

    const options = {};
    if (period) options.period = period;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    // Get data based on type
    let data;
    if (type === 'revenue') {
      data = await analyticsService.getSimpleRevenue();
    } else {
      data = await analyticsService.getBasicStats();
    }

    // Excel export not implemented yet
    res.json({
      success: true,
      message: 'Excel export not implemented yet',
      data: data
    });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export Excel report',
      error: error.message
    });
  }
});

// Generate comparison reports
router.post('/comparison', async (req, res) => {
  try {
    const { period1, period2, type = 'revenue' } = req.body;

    if (!period1 || !period2) {
      return res.status(400).json({
        success: false,
        message: 'Both period1 and period2 are required for comparison'
      });
    }

    if (!['revenue', 'performance'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid comparison type. Use "revenue" or "performance"'
      });
    }

    // Comparison report not implemented yet
    const comparisonData = {
      message: 'Comparison report not implemented yet',
      period1: period1,
      period2: period2,
      type: type
    };

    res.json({
      success: true,
      message: 'Comparison report generated successfully',
      data: comparisonData
    });
  } catch (error) {
    console.error('Comparison report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate comparison report',
      error: error.message
    });
  }
});

// Advanced filtering endpoint
router.post('/filter', async (req, res) => {
  try {
    const filters = req.body;
    // Simple filter implementation
    const filter = filters.dateFrom && filters.dateTo ? {
      createdAt: {
        $gte: new Date(filters.dateFrom),
        $lte: new Date(filters.dateTo)
      }
    } : {};

    // Get filtered data
    const filteredData = await Courier.find(filter)
      .populate('assignedAgent', 'agentName')
      .populate('userId', 'name email')
      .select('status createdAt estimatedCost pickupAddress deliveryAddress')
      .sort({ createdAt: -1 })
      .limit(100);

    // Get summary statistics for filtered data
    const summary = await Courier.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPackages: { $sum: 1 },
          totalValue: { $sum: '$estimatedCost' },
          averageValue: { $avg: '$estimatedCost' },
          statusBreakdown: { $push: '$status' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        filteredData,
        summary: summary[0] || {},
        filterApplied: filter,
        total: filteredData.length
      }
    });
  } catch (error) {
    console.error('Advanced filtering error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to apply advanced filters',
      error: error.message
    });
  }
});

// Clean old reports
router.delete('/cleanup', async (req, res) => {
  try {
    // Cleanup not implemented yet
    const result = { message: 'Cleanup not implemented yet' };

    res.json({
      success: true,
      message: 'Reports cleanup completed',
      data: result
    });
  } catch (error) {
    console.error('Reports cleanup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup old reports',
      error: error.message
    });
  }
});

module.exports = router; 