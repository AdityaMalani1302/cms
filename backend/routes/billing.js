const express = require('express');
const { body, validationResult } = require('express-validator');
const { authAdmin } = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');

const router = express.Router();

// @route   GET /api/billing/invoices
// @desc    Get all invoices with filters (Admin only)
// @access  Private (Admin)
router.get('/invoices', authAdmin, async (req, res) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = {};
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.email': { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const invoices = await Invoice.find(query)
      .populate('bookingId', 'trackingId')
      .populate('paymentId', 'razorpayPaymentId status')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices'
    });
  }
});

// @route   PUT /api/billing/invoice/:invoiceId/status
// @desc    Update invoice status (Admin only)
// @access  Private (Admin)
router.put('/invoice/:invoiceId/status', [
  authAdmin,
  body('status').isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled']).withMessage('Invalid status')
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

    const { invoiceId } = req.params;
    const { status } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.status = status;
    if (status === 'paid') {
      invoice.paidDate = new Date();
    }
    
    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice status updated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice status'
    });
  }
});

// @route   GET /api/billing/analytics
// @desc    Get billing analytics (Admin only)
// @access  Private (Admin)
router.get('/analytics', authAdmin, async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Overview statistics
    const overview = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$amounts.total' },
          totalTax: { $sum: '$amounts.tax' },
          avgInvoiceValue: { $avg: '$amounts.total' }
        }
      }
    ]);

    // Status breakdown
    const statusBreakdown = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amounts.total' }
        }
      }
    ]);

    // Revenue trend based on period
    let groupBy;
    switch (period) {
      case 'day':
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'week':
        groupBy = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
        break;
      case 'month':
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'year':
        groupBy = { $dateToString: { format: '%Y', date: '$createdAt' } };
        break;
      default:
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }

    const revenueTrend = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$amounts.total' },
          invoiceCount: { $sum: 1 },
          taxes: { $sum: '$amounts.tax' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Top customers by revenue
    const topCustomers = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$customerDetails.email',
          customerName: { $first: '$customerDetails.name' },
          totalRevenue: { $sum: '$amounts.total' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Payment method analysis
    const paymentMethodAnalysis = await Payment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    // Outstanding invoices
    const outstandingInvoices = await Invoice.aggregate([
      { 
        $match: { 
          status: { $in: ['sent', 'overdue'] },
          ...matchStage
        } 
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$amounts.total' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: overview[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalTax: 0,
          avgInvoiceValue: 0
        },
        statusBreakdown,
        revenueTrend,
        topCustomers,
        paymentMethodAnalysis,
        outstanding: outstandingInvoices[0] || { count: 0, amount: 0 }
      }
    });
  } catch (error) {
    console.error('Billing analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing analytics'
    });
  }
});

// @route   GET /api/billing/reports/revenue
// @desc    Generate revenue report (Admin only)
// @access  Private (Admin)
router.get('/reports/revenue', authAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%U';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const revenueReport = await Transaction.aggregate([
      {
        $match: {
          type: 'payment',
          status: 'completed',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
          fees: { $sum: '$fees.total' },
          netRevenue: { $sum: '$netAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Calculate totals
    const totals = revenueReport.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.revenue,
      transactions: acc.transactions + curr.transactions,
      fees: acc.fees + curr.fees,
      netRevenue: acc.netRevenue + curr.netRevenue
    }), { revenue: 0, transactions: 0, fees: 0, netRevenue: 0 });

    res.json({
      success: true,
      data: {
        report: revenueReport,
        summary: {
          ...totals,
          period: { startDate, endDate },
          averageTransaction: totals.transactions > 0 ? totals.revenue / totals.transactions : 0
        }
      }
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue report'
    });
  }
});

// @route   GET /api/billing/reports/taxes
// @desc    Generate tax report (Admin only)
// @access  Private (Admin)
router.get('/reports/taxes', authAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const taxReport = await Invoice.aggregate([
      {
        $match: {
          status: 'paid',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          totalRevenue: { $sum: '$amounts.subtotal' },
          totalTax: { $sum: '$amounts.tax' },
          cgst: { $sum: '$taxDetails.cgst' },
          sgst: { $sum: '$taxDetails.sgst' },
          igst: { $sum: '$taxDetails.igst' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const totals = taxReport.reduce((acc, curr) => ({
      totalRevenue: acc.totalRevenue + curr.totalRevenue,
      totalTax: acc.totalTax + curr.totalTax,
      cgst: acc.cgst + curr.cgst,
      sgst: acc.sgst + curr.sgst,
      igst: acc.igst + curr.igst,
      invoiceCount: acc.invoiceCount + curr.invoiceCount
    }), { totalRevenue: 0, totalTax: 0, cgst: 0, sgst: 0, igst: 0, invoiceCount: 0 });

    res.json({
      success: true,
      data: {
        report: taxReport,
        summary: {
          ...totals,
          period: { startDate, endDate },
          effectiveTaxRate: totals.totalRevenue > 0 ? (totals.totalTax / totals.totalRevenue) * 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Tax report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate tax report'
    });
  }
});

module.exports = router; 