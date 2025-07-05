const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const Courier = require('../models/Courier');
const Payment = require('../models/Payment');
const User = require('../models/User');
const DeliveryAgent = require('../models/DeliveryAgent');
const Review = require('../models/Review');
const Booking = require('../models/Booking');

class AnalyticsService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../reports');
    this.ensureReportsDirectory();
  }

  // Ensure reports directory exists
  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Generate date range filter
  getDateRange(period = '30d', startDate = null, endDate = null) {
    const end = endDate ? moment(endDate) : moment();
    let start;

    if (startDate) {
      start = moment(startDate);
    } else {
      switch (period) {
        case '7d':
          start = moment().subtract(7, 'days');
          break;
        case '30d':
          start = moment().subtract(30, 'days');
          break;
        case '3m':
          start = moment().subtract(3, 'months');
          break;
        case '6m':
          start = moment().subtract(6, 'months');
          break;
        case '1y':
          start = moment().subtract(1, 'year');
          break;
        default:
          start = moment().subtract(30, 'days');
      }
    }

    return {
      startDate: start.toDate(),
      endDate: end.toDate(),
      period
    };
  }

  // Revenue Analytics
  async getRevenueAnalytics(options = {}) {
    try {
      const { startDate, endDate, period } = this.getDateRange(
        options.period,
        options.startDate,
        options.endDate
      );

      // Monthly/Yearly revenue reports
      const revenueByPeriod = await Payment.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$completedAt' },
              month: { $month: '$completedAt' },
              ...(period === '7d' && { day: { $dayOfMonth: '$completedAt' } })
            },
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            averageOrderValue: { $avg: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Payment method analytics
      const paymentMethodAnalytics = await Payment.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$paymentMethod',
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]);

      // Revenue trends
      const totalRevenue = await Payment.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            averageOrderValue: { $avg: '$amount' }
          }
        }
      ]);

      // Calculate profit margins (simplified - assumes 20% cost)
      const profitAnalysis = {
        totalRevenue: totalRevenue[0]?.totalRevenue || 0,
        estimatedCosts: (totalRevenue[0]?.totalRevenue || 0) * 0.2,
        estimatedProfit: (totalRevenue[0]?.totalRevenue || 0) * 0.8,
        profitMargin: 80 // Simplified 80% margin
      };

      return {
        period: { startDate, endDate, period },
        revenueByPeriod,
        paymentMethodAnalytics,
        totalRevenue: totalRevenue[0] || {},
        profitAnalysis,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Revenue analytics error:', error);
      throw new Error('Failed to generate revenue analytics');
    }
  }

  // Performance Metrics
  async getPerformanceMetrics(options = {}) {
    try {
      const { startDate, endDate } = this.getDateRange(
        options.period,
        options.startDate,
        options.endDate
      );

      // Delivery agent performance
      const agentPerformance = await Courier.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            assignedAgent: { $ne: null }
          }
        },
        {
          $lookup: {
            from: 'deliveryagents',
            localField: 'assignedAgent',
            foreignField: '_id',
            as: 'agent'
          }
        },
        { $unwind: '$agent' },
        {
          $group: {
            _id: '$assignedAgent',
            agentName: { $first: '$agent.agentName' },
            totalDeliveries: { $sum: 1 },
            completedDeliveries: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
            },
            avgDeliveryTime: {
              $avg: {
                $cond: [
                  { $and: ['$actualDeliveryDate', '$actualPickupDate'] },
                  {
                    $divide: [
                      { $subtract: ['$actualDeliveryDate', '$actualPickupDate'] },
                      86400000 // Convert to days
                    ]
                  },
                  null
                ]
              }
            },
            onTimeDeliveries: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      '$actualDeliveryDate',
                      '$expectedDeliveryDate',
                      { $lte: ['$actualDeliveryDate', '$expectedDeliveryDate'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            completionRate: {
              $multiply: [
                { $divide: ['$completedDeliveries', '$totalDeliveries'] },
                100
              ]
            },
            onTimeRate: {
              $multiply: [
                { $divide: ['$onTimeDeliveries', '$totalDeliveries'] },
                100
              ]
            }
          }
        },
        { $sort: { completionRate: -1 } }
      ]);

      // Customer satisfaction scores
      const satisfactionScores = await Review.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: '$rating'
            }
          }
        }
      ]);

      // Delivery time analytics
      const deliveryTimeAnalytics = await Courier.aggregate([
        {
          $match: {
            status: 'Delivered',
            actualDeliveryDate: { $ne: null },
            actualPickupDate: { $ne: null },
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $addFields: {
            deliveryTimeHours: {
              $divide: [
                { $subtract: ['$actualDeliveryDate', '$actualPickupDate'] },
                3600000 // Convert to hours
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            averageDeliveryTime: { $avg: '$deliveryTimeHours' },
            minDeliveryTime: { $min: '$deliveryTimeHours' },
            maxDeliveryTime: { $max: '$deliveryTimeHours' },
            totalDeliveries: { $sum: 1 }
          }
        }
      ]);

      // Service quality metrics
      const serviceMetrics = await Courier.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalPackages: { $sum: 1 },
            deliveredPackages: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
            },
            cancelledPackages: {
              $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
            },
            lostPackages: {
              $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] }
            },
            damagedPackages: {
              $sum: { $cond: [{ $eq: ['$status', 'Damaged'] }, 1, 0] }
            }
          }
        },
        {
          $addFields: {
            deliverySuccessRate: {
              $multiply: [
                { $divide: ['$deliveredPackages', '$totalPackages'] },
                100
              ]
            },
            cancellationRate: {
              $multiply: [
                { $divide: ['$cancelledPackages', '$totalPackages'] },
                100
              ]
            }
          }
        }
      ]);

      return {
        period: { startDate, endDate },
        agentPerformance,
        satisfactionScores: satisfactionScores[0] || {},
        deliveryTimeAnalytics: deliveryTimeAnalytics[0] || {},
        serviceMetrics: serviceMetrics[0] || {},
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Performance metrics error:', error);
      throw new Error('Failed to generate performance metrics');
    }
  }

  // Export to PDF
  async exportToPDF(data, type = 'revenue', options = {}) {
    try {
      const doc = new PDFDocument();
      const filename = `${type}_report_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
      const filepath = path.join(this.reportsDir, filename);

      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20).text('CMS Analytics Report', { align: 'center' });
      doc.fontSize(14).text(`Report Type: ${type.toUpperCase()}`, { align: 'center' });
      doc.fontSize(12).text(`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, { align: 'center' });
      doc.moveDown();

      if (type === 'revenue') {
        this.addRevenueContentToPDF(doc, data);
      } else if (type === 'performance') {
        this.addPerformanceContentToPDF(doc, data);
      }

      doc.end();

      return {
        filename,
        filepath,
        relativePath: `reports/${filename}`
      };
    } catch (error) {
      console.error('PDF export error:', error);
      throw new Error('Failed to export PDF report');
    }
  }

  // Add revenue content to PDF
  addRevenueContentToPDF(doc, data) {
    // Total Revenue Summary
    doc.fontSize(16).text('Revenue Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Revenue: ₹${data.totalRevenue.totalRevenue || 0}`);
    doc.text(`Total Transactions: ${data.totalRevenue.totalTransactions || 0}`);
    doc.text(`Average Order Value: ₹${(data.totalRevenue.averageOrderValue || 0).toFixed(2)}`);
    doc.moveDown();

    // Profit Analysis
    doc.fontSize(16).text('Profit Analysis', { underline: true });
    doc.fontSize(12);
    doc.text(`Estimated Profit: ₹${data.profitAnalysis.estimatedProfit.toFixed(2)}`);
    doc.text(`Estimated Costs: ₹${data.profitAnalysis.estimatedCosts.toFixed(2)}`);
    doc.text(`Profit Margin: ${data.profitAnalysis.profitMargin}%`);
    doc.moveDown();

    // Payment Methods
    if (data.paymentMethodAnalytics.length > 0) {
      doc.fontSize(16).text('Payment Method Breakdown', { underline: true });
      doc.fontSize(12);
      data.paymentMethodAnalytics.forEach(method => {
        doc.text(`${method._id}: ₹${method.totalRevenue} (${method.totalTransactions} transactions)`);
      });
    }
  }

  // Add performance content to PDF
  addPerformanceContentToPDF(doc, data) {
    // Service Metrics
    doc.fontSize(16).text('Service Quality Metrics', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Packages: ${data.serviceMetrics.totalPackages || 0}`);
    doc.text(`Delivery Success Rate: ${(data.serviceMetrics.deliverySuccessRate || 0).toFixed(2)}%`);
    doc.text(`Cancellation Rate: ${(data.serviceMetrics.cancellationRate || 0).toFixed(2)}%`);
    doc.moveDown();

    // Delivery Time Analytics
    if (data.deliveryTimeAnalytics.averageDeliveryTime) {
      doc.fontSize(16).text('Delivery Time Analytics', { underline: true });
      doc.fontSize(12);
      doc.text(`Average Delivery Time: ${data.deliveryTimeAnalytics.averageDeliveryTime.toFixed(2)} hours`);
      doc.text(`Fastest Delivery: ${data.deliveryTimeAnalytics.minDeliveryTime.toFixed(2)} hours`);
      doc.text(`Slowest Delivery: ${data.deliveryTimeAnalytics.maxDeliveryTime.toFixed(2)} hours`);
      doc.moveDown();
    }

    // Customer Satisfaction
    if (data.satisfactionScores.averageRating) {
      doc.fontSize(16).text('Customer Satisfaction', { underline: true });
      doc.fontSize(12);
      doc.text(`Average Rating: ${data.satisfactionScores.averageRating.toFixed(2)}/5`);
      doc.text(`Total Reviews: ${data.satisfactionScores.totalReviews}`);
    }
  }

  // Export to CSV
  async exportToCSV(data, type = 'revenue', options = {}) {
    try {
      const filename = `${type}_report_${moment().format('YYYY-MM-DD_HH-mm')}.csv`;
      const filepath = path.join(this.reportsDir, filename);

      let records = [];
      let headers = [];

      if (type === 'revenue' && data.revenueByPeriod) {
        headers = [
          { id: 'period', title: 'Period' },
          { id: 'revenue', title: 'Revenue (₹)' },
          { id: 'transactions', title: 'Transactions' },
          { id: 'avgOrderValue', title: 'Avg Order Value (₹)' }
        ];

        records = data.revenueByPeriod.map(item => ({
          period: `${item._id.year}-${item._id.month}${item._id.day ? `-${item._id.day}` : ''}`,
          revenue: item.totalRevenue,
          transactions: item.totalTransactions,
          avgOrderValue: item.averageOrderValue.toFixed(2)
        }));
      } else if (type === 'performance' && data.agentPerformance) {
        headers = [
          { id: 'agentName', title: 'Agent Name' },
          { id: 'totalDeliveries', title: 'Total Deliveries' },
          { id: 'completedDeliveries', title: 'Completed Deliveries' },
          { id: 'completionRate', title: 'Completion Rate (%)' },
          { id: 'onTimeRate', title: 'On-Time Rate (%)' },
          { id: 'avgDeliveryTime', title: 'Avg Delivery Time (days)' }
        ];

        records = data.agentPerformance.map(agent => ({
          agentName: agent.agentName,
          totalDeliveries: agent.totalDeliveries,
          completedDeliveries: agent.completedDeliveries,
          completionRate: agent.completionRate.toFixed(2),
          onTimeRate: agent.onTimeRate.toFixed(2),
          avgDeliveryTime: (agent.avgDeliveryTime || 0).toFixed(2)
        }));
      }

      const csvWriter = createCsvWriter({
        path: filepath,
        header: headers
      });

      await csvWriter.writeRecords(records);

      return {
        filename,
        filepath,
        relativePath: `reports/${filename}`
      };
    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error('Failed to export CSV report');
    }
  }

  // Export to Excel
  async exportToExcel(data, type = 'revenue', options = {}) {
    try {
      const filename = `${type}_report_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
      const filepath = path.join(this.reportsDir, filename);

      const workbook = XLSX.utils.book_new();

      if (type === 'revenue') {
        // Revenue by period sheet
        if (data.revenueByPeriod) {
          const revenueData = data.revenueByPeriod.map(item => ({
            Period: `${item._id.year}-${item._id.month}${item._id.day ? `-${item._id.day}` : ''}`,
            Revenue: item.totalRevenue,
            Transactions: item.totalTransactions,
            'Avg Order Value': item.averageOrderValue.toFixed(2)
          }));
          const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
          XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue by Period');
        }

        // Payment methods sheet
        if (data.paymentMethodAnalytics) {
          const paymentData = data.paymentMethodAnalytics.map(method => ({
            'Payment Method': method._id,
            Revenue: method.totalRevenue,
            Transactions: method.totalTransactions,
            'Average Amount': method.averageAmount.toFixed(2)
          }));
          const paymentSheet = XLSX.utils.json_to_sheet(paymentData);
          XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payment Methods');
        }
      } else if (type === 'performance') {
        // Agent performance sheet
        if (data.agentPerformance) {
          const agentData = data.agentPerformance.map(agent => ({
            'Agent Name': agent.agentName,
            'Total Deliveries': agent.totalDeliveries,
            'Completed Deliveries': agent.completedDeliveries,
            'Completion Rate (%)': agent.completionRate.toFixed(2),
            'On-Time Rate (%)': agent.onTimeRate.toFixed(2),
            'Avg Delivery Time (days)': (agent.avgDeliveryTime || 0).toFixed(2)
          }));
          const agentSheet = XLSX.utils.json_to_sheet(agentData);
          XLSX.utils.book_append_sheet(workbook, agentSheet, 'Agent Performance');
        }
      }

      XLSX.writeFile(workbook, filepath);

      return {
        filename,
        filepath,
        relativePath: `reports/${filename}`
      };
    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Failed to export Excel report');
    }
  }

  // Advanced filtering for reports
  buildAdvancedFilter(filters = {}) {
    const filter = {};

    // Date range
    if (filters.startDate || filters.endDate) {
      filter.createdAt = {};
      if (filters.startDate) filter.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) filter.createdAt.$lte = new Date(filters.endDate);
    }

    // Status filtering
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      filter.status = { $in: filters.status };
    }

    // Agent filtering
    if (filters.agentIds && Array.isArray(filters.agentIds) && filters.agentIds.length > 0) {
      filter.assignedAgent = { $in: filters.agentIds };
    }

    // Customer filtering
    if (filters.customerIds && Array.isArray(filters.customerIds) && filters.customerIds.length > 0) {
      filter.userId = { $in: filters.customerIds };
    }

    // Amount range filtering
    if (filters.minAmount || filters.maxAmount) {
      filter.estimatedCost = {};
      if (filters.minAmount) filter.estimatedCost.$gte = filters.minAmount;
      if (filters.maxAmount) filter.estimatedCost.$lte = filters.maxAmount;
    }

    // Location filtering
    if (filters.pickupCity) {
      filter['pickupAddress.city'] = filters.pickupCity;
    }
    if (filters.deliveryCity) {
      filter['deliveryAddress.city'] = filters.deliveryCity;
    }

    return filter;
  }

  // Generate comparison reports
  async generateComparisonReport(period1, period2, type = 'revenue') {
    try {
      const data1 = type === 'revenue' 
        ? await this.getRevenueAnalytics(period1)
        : await this.getPerformanceMetrics(period1);
        
      const data2 = type === 'revenue'
        ? await this.getRevenueAnalytics(period2) 
        : await this.getPerformanceMetrics(period2);

      const comparison = {
        period1: period1,
        period2: period2,
        data1,
        data2,
        type,
        generatedAt: new Date()
      };

      if (type === 'revenue') {
        comparison.insights = {
          revenueGrowth: this.calculateGrowth(
            data1.totalRevenue.totalRevenue || 0,
            data2.totalRevenue.totalRevenue || 0
          ),
          transactionGrowth: this.calculateGrowth(
            data1.totalRevenue.totalTransactions || 0,
            data2.totalRevenue.totalTransactions || 0
          ),
          avgOrderValueGrowth: this.calculateGrowth(
            data1.totalRevenue.averageOrderValue || 0,
            data2.totalRevenue.averageOrderValue || 0
          )
        };
      }

      return comparison;
    } catch (error) {
      console.error('Comparison report error:', error);
      throw new Error('Failed to generate comparison report');
    }
  }

  // Calculate growth percentage
  calculateGrowth(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  // Clean old reports (keep only last 30 days)
  async cleanOldReports() {
    try {
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
      const files = fs.readdirSync(this.reportsDir);
      
      let cleanedCount = 0;
      files.forEach(file => {
        const filepath = path.join(this.reportsDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.mtime < thirtyDaysAgo) {
          fs.unlinkSync(filepath);
          cleanedCount++;
        }
      });

      return { cleanedCount };
    } catch (error) {
      console.error('Clean reports error:', error);
      return { cleanedCount: 0, error: error.message };
    }
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

module.exports = analyticsService;