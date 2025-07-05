const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
    index: true
  },
  branch: {
    type: String,
    required: false,
    index: true
  },
  metrics: {
    // Courier Metrics
    couriers: {
      total: { type: Number, default: 0 },
      created: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      inTransit: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      averageDeliveryTime: { type: Number, default: 0 }, // in hours
      onTimeDeliveryRate: { type: Number, default: 0 }, // percentage
    },
    
    // Revenue Metrics
    revenue: {
      total: { type: Number, default: 0 },
      byService: {
        standard: { type: Number, default: 0 },
        express: { type: Number, default: 0 },
        sameDay: { type: Number, default: 0 },
        international: { type: Number, default: 0 }
      },
      averageOrderValue: { type: Number, default: 0 }
    },
    
    // Agent Performance
    agents: {
      total: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      averageDeliveriesPerAgent: { type: Number, default: 0 },
      topPerformers: [{
        agentId: String,
        agentName: String,
        deliveries: Number,
        rating: Number
      }]
    },
    
    // Customer Metrics
    customers: {
      totalOrders: { type: Number, default: 0 },
      newCustomers: { type: Number, default: 0 },
      returningCustomers: { type: Number, default: 0 },
      satisfactionScore: { type: Number, default: 0 } // 1-5 scale
    },
    
    // Complaint Metrics
    complaints: {
      total: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      averageResolutionTime: { type: Number, default: 0 }, // in hours
      byCategory: {
        delayedDelivery: { type: Number, default: 0 },
        damagedPackage: { type: Number, default: 0 },
        lostPackage: { type: Number, default: 0 },
        wrongDelivery: { type: Number, default: 0 },
        poorService: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
      }
    },
    
    // Operational Metrics
    operational: {
      capacity: {
        utilized: { type: Number, default: 0 }, // percentage
        available: { type: Number, default: 0 }
      },
      efficiency: {
        averagePickupTime: { type: Number, default: 0 }, // in hours
        routeOptimization: { type: Number, default: 0 }, // percentage
        fuelCost: { type: Number, default: 0 }
      }
    }
  },
  
  // Geographic data
  geographicData: {
    topCities: [{
      city: String,
      deliveries: Number,
      revenue: Number
    }],
    deliveryHeatmap: [{
      pincode: String,
      deliveries: Number,
      lat: Number,
      lng: Number
    }]
  },
  
  // Time-based patterns
  timePatterns: {
    hourlyDistribution: [{ // 24 hours
      hour: Number,
      deliveries: Number
    }],
    dailyDistribution: [{ // 7 days
      day: String,
      deliveries: Number
    }],
    monthlyTrends: [{ // 12 months
      month: String,
      deliveries: Number,
      revenue: Number
    }]
  },
  
  // Comparison data
  comparison: {
    previousPeriod: {
      deliveries: Number,
      revenue: Number,
      complaints: Number
    },
    growth: {
      deliveries: Number, // percentage
      revenue: Number, // percentage
      customers: Number // percentage
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
analyticsSchema.index({ date: -1, type: 1, branch: 1 });
analyticsSchema.index({ type: 1, branch: 1, date: -1 });

// Static method to generate analytics for a specific date and type
analyticsSchema.statics.generateAnalytics = async function(date, type, branch = null) {
  const Courier = require('./Courier');
  const Complaint = require('./Complaint');
  const DeliveryAgent = require('./DeliveryAgent');
  
  let dateRange = getDateRange(date, type);
  let filter = {
    createdAt: {
      $gte: dateRange.start,
      $lte: dateRange.end
    }
  };
  
  if (branch) {
    filter.senderBranch = branch;
  }
  
  // Generate courier metrics
  const courierMetrics = await generateCourierMetrics(filter);
  const revenueMetrics = await generateRevenueMetrics(filter);
  const agentMetrics = await generateAgentMetrics(filter, branch);
  const complaintMetrics = await generateComplaintMetrics(filter);
  const geographicData = await generateGeographicData(filter);
  const timePatterns = await generateTimePatterns(filter, type);
  
  // Create or update analytics record
  const analytics = await this.findOneAndUpdate(
    { date, type, branch },
    {
      date,
      type,
      branch,
      metrics: {
        couriers: courierMetrics,
        revenue: revenueMetrics,
        agents: agentMetrics,
        complaints: complaintMetrics
      },
      geographicData,
      timePatterns
    },
    { upsert: true, new: true }
  );
  
  return analytics;
};

// Helper functions
function getDateRange(date, type) {
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
    case 'yearly':
      start = new Date(targetDate.getFullYear(), 0, 1);
      end = new Date(targetDate.getFullYear(), 11, 31);
      break;
  }
  
  return { start, end };
}

async function generateCourierMetrics(filter) {
  const Courier = require('./Courier');
  
  const total = await Courier.countDocuments(filter);
  const delivered = await Courier.countDocuments({ ...filter, status: 'Delivered' });
  const inTransit = await Courier.countDocuments({ 
    ...filter, 
    status: { $in: ['Shipped', 'Intransit', 'Arrived at Destination', 'Out for Delivery'] } 
  });
  const failed = await Courier.countDocuments({ 
    ...filter, 
    status: { $in: ['Pickup Failed', 'Delivery Failed'] } 
  });
  
  // Calculate average delivery time for delivered packages
  const deliveredPackages = await Courier.find({ 
    ...filter, 
    status: 'Delivered',
    actualDeliveryDate: { $exists: true },
    createdAt: { $exists: true }
  }).select('createdAt actualDeliveryDate');
  
  let totalDeliveryTime = 0;
  deliveredPackages.forEach(pkg => {
    const deliveryTime = (new Date(pkg.actualDeliveryDate) - new Date(pkg.createdAt)) / (1000 * 60 * 60); // hours
    totalDeliveryTime += deliveryTime;
  });
  
  const averageDeliveryTime = deliveredPackages.length > 0 ? totalDeliveryTime / deliveredPackages.length : 0;
  
  return {
    total,
    created: total,
    delivered,
    inTransit,
    failed,
    averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
    onTimeDeliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0
  };
}

async function generateRevenueMetrics(filter) {
  const Courier = require('./Courier');
  
  const revenueData = await Courier.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: '$parcelPrice' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const total = revenueData[0]?.total || 0;
  const count = revenueData[0]?.count || 0;
  const averageOrderValue = count > 0 ? total / count : 0;
  
  return {
    total,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    byService: {
      standard: total * 0.6, // Mock data - you can implement actual service tracking
      express: total * 0.3,
      sameDay: total * 0.08,
      international: total * 0.02
    }
  };
}

async function generateAgentMetrics(filter, branch) {
  const DeliveryAgent = require('./DeliveryAgent');
  
  let agentFilter = {};
  if (branch) {
    agentFilter.assignedBranch = branch;
  }
  
  const total = await DeliveryAgent.countDocuments(agentFilter);
  const active = await DeliveryAgent.countDocuments({ ...agentFilter, status: 'active' });
  
  return {
    total,
    active,
    averageDeliveriesPerAgent: active > 0 ? Math.round((filter.total || 0) / active) : 0,
    topPerformers: [] // This would need actual delivery tracking per agent
  };
}

async function generateComplaintMetrics(filter) {
  const Complaint = require('./Complaint');
  
  const total = await Complaint.countDocuments(filter);
  const resolved = await Complaint.countDocuments({ ...filter, status: 'Resolved' });
  const pending = await Complaint.countDocuments({ 
    ...filter, 
    status: { $in: ['Open', 'In Progress', 'Pending Customer Response'] } 
  });
  
  return {
    total,
    resolved,
    pending,
    averageResolutionTime: 48, // Mock data - calculate from actual resolution times
    byCategory: {
      delayedDelivery: Math.round(total * 0.4),
      damagedPackage: Math.round(total * 0.2),
      lostPackage: Math.round(total * 0.15),
      wrongDelivery: Math.round(total * 0.1),
      poorService: Math.round(total * 0.1),
      other: Math.round(total * 0.05)
    }
  };
}

async function generateGeographicData(filter) {
  const Courier = require('./Courier');
  
  const cityData = await Courier.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$recipientCity',
        deliveries: { $sum: 1 },
        revenue: { $sum: '$parcelPrice' }
      }
    },
    { $sort: { deliveries: -1 } },
    { $limit: 10 }
  ]);
  
  return {
    topCities: cityData.map(city => ({
      city: city._id,
      deliveries: city.deliveries,
      revenue: city.revenue
    })),
    deliveryHeatmap: [] // Would need actual lat/lng data
  };
}

async function generateTimePatterns(filter, type) {
  // Mock time pattern data - in real implementation, this would analyze actual delivery times
  return {
    hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      deliveries: Math.floor(Math.random() * 50) + 10
    })),
    dailyDistribution: [
      { day: 'Monday', deliveries: 120 },
      { day: 'Tuesday', deliveries: 135 },
      { day: 'Wednesday', deliveries: 140 },
      { day: 'Thursday', deliveries: 145 },
      { day: 'Friday', deliveries: 160 },
      { day: 'Saturday', deliveries: 100 },
      { day: 'Sunday', deliveries: 80 }
    ],
    monthlyTrends: [] // Would be populated based on historical data
  };
}

module.exports = mongoose.model('Analytics', analyticsSchema); 