const Courier = require('../models/Courier');
// Payment model removed
const User = require('../models/User');
const DeliveryAgent = require('../models/DeliveryAgent');
// Review model removed
const Booking = require('../models/Booking');

class AnalyticsService {
  constructor() {
    // Simplified analytics service for college project
  }

  // Basic statistics for college project
  async getBasicStats() {
    try {
      const totalCouriers = await Courier.countDocuments();
      const totalUsers = await User.countDocuments();
      const totalAgents = await DeliveryAgent.countDocuments();
      // Payment system removed
      const totalRevenue = [{ total: 0 }];

      return {
        totalCouriers,
        totalUsers,
        totalAgents,
        totalRevenue: totalRevenue[0]?.total || 0,
        deliveredPackages: await Courier.countDocuments({ status: 'Delivered' }),
        pendingPackages: await Courier.countDocuments({ status: { $nin: ['Delivered', 'Cancelled'] } })
      };
    } catch (error) {
      console.error('Basic stats error:', error);
      throw new Error('Failed to get basic statistics');
    }
  }

  // Revenue analytics disabled - payment system removed
  async getSimpleRevenue() {
    try {
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        paymentMethods: [],
        message: 'Payment system disabled',
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Revenue analytics error:', error);
      throw new Error('Failed to get revenue data');
    }
  }

}

const analyticsService = new AnalyticsService();
module.exports = analyticsService;