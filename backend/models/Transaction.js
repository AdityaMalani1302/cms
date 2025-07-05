const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
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
  type: {
    type: String,
    enum: ['payment', 'refund', 'fee', 'adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['razorpay', 'bank_transfer', 'wallet', 'cash', 'adjustment'],
    required: true
  },
  gatewayTransactionId: {
    type: String
  },
  gatewayResponse: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  reference: {
    type: String,
    trim: true
  },
  fees: {
    gateway: { type: Number, default: 0 },
    platform: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  netAmount: {
    type: Number,
    required: true
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
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

// Generate unique transaction ID before validation
transactionSchema.pre('validate', async function(next) {
  if (!this.transactionId) {
    const prefix = this.type.toUpperCase().substring(0, 3);
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.transactionId = `${prefix}${timestamp}${random}`;
  }
  
  // Calculate net amount
  if (this.amount && this.fees) {
    this.netAmount = this.amount - (this.fees.total || 0);
  }
  
  next();
});

// Indexes for better query performance
transactionSchema.index({ paymentId: 1 });
transactionSchema.index({ bookingId: 1 });
transactionSchema.index({ userId: 1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

// Instance method to mark as completed
transactionSchema.methods.markCompleted = function(gatewayTransactionId, gatewayResponse) {
  this.status = 'completed';
  this.processedAt = new Date();
  if (gatewayTransactionId) this.gatewayTransactionId = gatewayTransactionId;
  if (gatewayResponse) this.gatewayResponse = gatewayResponse;
  return this.save();
};

// Instance method to mark as failed
transactionSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.processedAt = new Date();
  return this.save();
};

// Static method to get transaction summary for a user
transactionSchema.statics.getUserSummary = function(userId, startDate, endDate) {
  const match = { userId, status: 'completed' };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        totalNetAmount: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema); 