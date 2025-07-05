const express = require('express');
const { body, validationResult } = require('express-validator');
const PaymentService = require('../services/paymentService');
const { authUser, authAdmin } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// @route   POST /api/payments/create-order
// @desc    Create Razorpay order for booking payment
// @access  Private (User)
router.post('/create-order', [
  authUser,
  body('bookingId').isMongoId().withMessage('Valid booking ID required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0')
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

    const { bookingId, amount, currency = 'INR' } = req.body;
    const userId = req.user.id;

    const orderData = await PaymentService.createOrder(bookingId, userId, amount, currency);

    res.json({
      success: true,
      message: 'Order created successfully',
      data: orderData,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order'
    });
  }
});

// @route   POST /api/payments/verify
// @desc    Verify payment and complete transaction
// @access  Private (User)
router.post('/verify', [
  authUser,
  body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature').notEmpty().withMessage('Signature is required')
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    const result = await PaymentService.completePayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId
    );

    res.json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        payment: result.payment,
        booking: result.booking,
        invoice: result.invoice
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
});

// @route   POST /api/payments/failure
// @desc    Handle payment failure
// @access  Private (User)
router.post('/failure', [
  authUser,
  body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
  body('error_description').optional().isString()
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

    const { razorpay_order_id, error_description } = req.body;
    const userId = req.user.id;

    const result = await PaymentService.handlePaymentFailure(
      razorpay_order_id,
      error_description || 'Payment failed',
      userId
    );

    res.json({
      success: true,
      message: 'Payment failure recorded',
      data: result
    });
  } catch (error) {
    console.error('Payment failure handling error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to handle payment failure'
    });
  }
});

// @route   GET /api/payments/user/:userId
// @desc    Get payment history for user
// @access  Private (User/Admin)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Check authorization - users can only see their own payments, admins can see all
    if (req.user.userType !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    let query = { userId };
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('bookingId', 'trackingId pickupAddress deliveryAddress')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

// @route   GET /api/payments/invoice/:invoiceId
// @desc    Get invoice details
// @access  Private (User/Admin)
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId)
      .populate('bookingId', 'trackingId')
      .populate('paymentId', 'razorpayPaymentId amount status');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check authorization
    if (req.user.userType !== 'admin' && req.user.id !== invoice.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice'
    });
  }
});

// @route   GET /api/payments/invoice/:invoiceId/download
// @desc    Download invoice PDF
// @access  Private (User/Admin)
router.get('/invoice/:invoiceId/download', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check authorization
    if (req.user.userType !== 'admin' && req.user.id !== invoice.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!invoice.pdfPath) {
      return res.status(404).json({
        success: false,
        message: 'PDF not available'
      });
    }

    const filePath = path.join(__dirname, '..', invoice.pdfPath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found'
      });
    }

    // Increment download count
    await invoice.incrementDownload();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download invoice'
    });
  }
});

// @route   GET /api/payments/transactions/:userId
// @desc    Get transaction history for user
// @access  Private (User/Admin)
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Check authorization
    if (req.user.userType !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    let query = { userId };
    if (type) query.type = type;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('bookingId', 'trackingId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    // Get summary
    const summary = await Transaction.getUserSummary(userId, startDate, endDate);

    res.json({
      success: true,
      data: {
        transactions,
        summary,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

// @route   POST /api/payments/refund
// @desc    Process refund (Admin only)
// @access  Private (Admin)
router.post('/refund', [
  authAdmin,
  body('paymentId').isMongoId().withMessage('Valid payment ID required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('reason').notEmpty().withMessage('Reason is required')
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

    const { paymentId, amount, reason } = req.body;
    const processedBy = req.admin.id;

    const result = await PaymentService.processRefund(paymentId, amount, reason, processedBy);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: result
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund'
    });
  }
});

// @route   GET /api/payments/analytics
// @desc    Get payment analytics (Admin only)
// @access  Private (Admin)
router.get('/analytics', authAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = { status: 'completed' };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const analytics = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$amount' },
          totalFees: { $sum: '$transactionFee' }
        }
      }
    ]);

    const methodBreakdown = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    const dailyRevenue = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: analytics[0] || {
          totalRevenue: 0,
          totalTransactions: 0,
          averageTransaction: 0,
          totalFees: 0
        },
        methodBreakdown,
        dailyRevenue
      }
    });
  } catch (error) {
    console.error('Payment analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment analytics'
    });
  }
});

module.exports = router; 