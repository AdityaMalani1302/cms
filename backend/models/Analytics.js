const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
    index: true
  },
  metrics: {
    // Basic Courier Metrics
    couriers: {
      total: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      inTransit: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    },
    
    // Basic Revenue Metrics
    revenue: {
      total: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 }
    },
    
    // Basic Agent Metrics
    agents: {
      total: { type: Number, default: 0 },
      active: { type: Number, default: 0 }
    },
    
    // Basic Customer Metrics
    customers: {
      totalOrders: { type: Number, default: 0 },
      newCustomers: { type: Number, default: 0 }
    },
    
    // Basic Complaint Metrics
    complaints: {
      total: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      pending: { type: Number, default: 0 }
    }
  }
}, {
  timestamps: true
});

// Basic index for querying
analyticsSchema.index({ date: -1, type: 1 });

// Simplified method to generate basic analytics
analyticsSchema.statics.generateBasicAnalytics = async function(date, type) {
  const Courier = require('./Courier');
  const Complaint = require('./Complaint');
  const DeliveryAgent = require('./DeliveryAgent');
  const User = require('./User');
  
  let dateRange = this.getDateRange(date, type);
  let filter = {
    createdAt: {
      $gte: dateRange.start,
      $lte: dateRange.end
    }
  };
  
  // Basic courier metrics
  const totalCouriers = await Courier.countDocuments(filter);
  const deliveredCouriers = await Courier.countDocuments({
    ...filter,
    status: 'Delivered'
  });
  const inTransitCouriers = await Courier.countDocuments({
    ...filter,
    status: { $in: ['Shipped', 'Intransit', 'Out for Delivery'] }
  });
  
  // Basic revenue
  const revenueData = await Courier.aggregate([
    { $match: filter },
    { $group: { 
      _id: null, 
      total: { $sum: '$parcelPrice' },
      average: { $avg: '$parcelPrice' }
    }}
  ]);
  
  // Basic complaints
  const totalComplaints = await Complaint.countDocuments(filter);
  const resolvedComplaints = await Complaint.countDocuments({
    ...filter,
    status: 'resolved'
  });
  
  // Basic counts
  const totalAgents = await DeliveryAgent.countDocuments();
  const activeAgents = await DeliveryAgent.countDocuments({ isActive: true });
  const newCustomers = await User.countDocuments(filter);
  
  const analytics = {
    date,
    type,
    metrics: {
      couriers: {
        total: totalCouriers,
        delivered: deliveredCouriers,
        inTransit: inTransitCouriers,
        failed: totalCouriers - deliveredCouriers - inTransitCouriers
      },
      revenue: {
        total: revenueData[0]?.total || 0,
        averageOrderValue: revenueData[0]?.average || 0
      },
      agents: {
        total: totalAgents,
        active: activeAgents
      },
      customers: {
        totalOrders: totalCouriers,
        newCustomers: newCustomers
      },
      complaints: {
        total: totalComplaints,
        resolved: resolvedComplaints,
        pending: totalComplaints - resolvedComplaints
      }
    }
  };
  
  return await this.findOneAndUpdate(
    { date, type },
    analytics,
    { upsert: true, new: true }
  );
};

// Helper to get date range
analyticsSchema.statics.getDateRange = function(date, type) {
  const targetDate = new Date(date);
  let start, end;
  
  switch (type) {
    case 'daily':
      start = new Date(targetDate.setHours(0, 0, 0, 0));
      end = new Date(targetDate.setHours(23, 59, 59, 999));
      break;
    case 'weekly':
      start = new Date(targetDate.setDate(targetDate.getDate() - targetDate.getDay()));
      end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      break;
    default:
      start = new Date(targetDate.setHours(0, 0, 0, 0));
      end = new Date(targetDate.setHours(23, 59, 59, 999));
  }
  
  return { start, end };
};

module.exports = mongoose.model('Analytics', analyticsSchema); 