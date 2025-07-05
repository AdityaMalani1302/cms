const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateUser } = require('../middleware/auth');
const SupportTicket = require('../models/SupportTicket');

const router = express.Router();

// Validation rules
const validationRules = {
  createTicket: [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('category').optional().isIn(['General', 'Booking Issue', 'Delivery Problem', 'Payment', 'Technical', 'Others']).withMessage('Valid category is required')
  ],
  addResponse: [
    body('message').notEmpty().withMessage('Response message is required')
  ]
};

// Apply authentication to all routes
router.use(authenticateUser);

// Create new support ticket
router.post('/tickets', validationRules.createTicket, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { subject, message, category } = req.body;

    const ticket = await new SupportTicket({
      userId: req.user._id,
      subject,
      message,
      category: category || 'General'
    }).save();

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's support tickets
router.get('/tickets/my', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [total, tickets] = await Promise.all([
      SupportTicket.countDocuments({ userId: req.user._id }),
      SupportTicket.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('ticketId subject category status priority createdAt')
    ]);

    res.json({
      success: true,
      tickets,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single support ticket
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add response to support ticket
router.post('/tickets/:id/responses', validationRules.addResponse, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    if (ticket.status === 'Closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add response to closed ticket'
      });
    }

    ticket.responses.push({
      message: req.body.message,
      respondedBy: req.user.name,
      isStaffResponse: false
    });

    // If ticket was resolved, reopen it
    if (ticket.status === 'Resolved') {
      ticket.status = 'Open';
      ticket.resolvedAt = null;
      ticket.resolvedBy = null;
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Response added successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 