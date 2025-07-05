const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ['General', 'Booking Issue', 'Delivery Problem', 'Payment', 'Technical', 'Others'],
    default: 'General'
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  responses: [{
    message: {
      type: String,
      required: true,
      trim: true
    },
    respondedBy: {
      type: String,
      required: true,
      trim: true
    },
    respondedAt: {
      type: Date,
      default: Date.now
    },
    isStaffResponse: {
      type: Boolean,
      default: false
    }
  }],
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate unique ticket ID
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const prefix = 'TKT';
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.ticketId = `${prefix}${randomNum}`;
  }
  next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema); 