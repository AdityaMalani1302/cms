const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpaySignature: {
    type: String
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'cod', 'wallet'],
    required: true
  },
  transactionFee: {
    type: Number,
    default: 0
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String,
    trim: true
  },
  paymentAttempts: {
    type: Number,
    default: 0
  },
  lastAttemptDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Instance method to mark payment as completed
paymentSchema.methods.markCompleted = function(paymentId, signature) {
  this.razorpayPaymentId = paymentId;
  this.razorpaySignature = signature;
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Instance method to mark payment as failed
paymentSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.paymentAttempts += 1;
  this.lastAttemptDate = new Date();
  return this.save();
};

// Static method to find payments by user
paymentSchema.statics.findByUser = function(userId, status = null) {
  let query = { userId };
  if (status) query.status = status;
  return this.find(query).populate('bookingId').sort({ createdAt: -1 });
};

module.exports = mongoose.model('Payment', paymentSchema); 