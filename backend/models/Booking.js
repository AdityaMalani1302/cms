const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trackingId: {
    type: String,
    unique: true,
    required: true
  },
  pickupAddress: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India'
    }
  },
  deliveryAddress: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India'
    }
  },
  recipientName: {
    type: String,
    required: true,
    trim: true
  },
  recipientPhone: {
    type: String,
    required: true,
    trim: true
  },
  packageType: {
    type: String,
    required: true,
    enum: ['Document', 'Electronics', 'Fragile', 'Clothing', 'Food', 'Others'],
    trim: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0.1,
    max: 50 // kg
  },
  deliverySpeed: {
    type: String,
    required: true,
    enum: ['Standard', 'Express', 'Same-day'],
    default: 'Standard'
  },
  estimatedCost: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDetails: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cod', 'wallet'],
      required: true,
      default: 'cod'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    razorpayOrderId: {
      type: String
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    }
  },
  status: {
    type: String,
    enum: ['Pending Payment', 'Payment Failed', 'Pending Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending Payment'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  pickupDate: {
    type: Date,
    required: true
  },
  expectedDeliveryDate: {
    type: Date,
    required: true
  },
  actualDeliveryDate: {
    type: Date
  },
  cancelReason: {
    type: String,
    trim: true
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true
});

// Generate unique tracking ID before validation
bookingSchema.pre('validate', async function(next) {
  if (!this.trackingId) {
    let trackingId;
    let isUnique = false;
    
    // Keep generating until we get a unique tracking ID
    while (!isUnique) {
      const prefix = 'TRK';
      const randomNum = Math.floor(100000000 + Math.random() * 900000000);
      trackingId = `${prefix}${randomNum}`;
      
      // Check if this tracking ID already exists
      const existingBooking = await this.constructor.findOne({ trackingId });
      if (!existingBooking) {
        isUnique = true;
      }
    }
    
    this.trackingId = trackingId;
    console.log(`Generated tracking ID: ${trackingId}`);
  }
  next();
});

// Add status history entry when status changes
bookingSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema); 