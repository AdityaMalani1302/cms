const mongoose = require('mongoose');

const courierSchema = new mongoose.Schema({
  refNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 120
  },
  senderBranch: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  senderContactNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15
  },
  senderAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  senderCity: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  senderState: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  senderPincode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  senderCountry: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  recipientName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  recipientContactNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15
  },
  recipientAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  recipientCity: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  recipientState: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  recipientPincode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  recipientCountry: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  courierDescription: {
    type: String,
    trim: true,
    maxlength: 250
  },
  parcelWeight: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  parcelDimensionLength: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  parcelDimensionWidth: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  parcelDimensionHeight: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  parcelPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Courier Pickup', 'Shipped', 'Intransit', 'Arrived at Destination', 'Out for Delivery', 'Delivered', 'Pickup Failed', 'Delivery Failed'],
    default: 'Courier Pickup'
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  approvedAt: {
    type: Date,
    required: false
  },
  rejectionReason: {
    type: String,
    required: false,
    trim: true,
    maxlength: 500
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryAgent',
    required: false
  },
  pickupDate: {
    type: Date,
    required: false
  },
  expectedDeliveryDate: {
    type: Date,
    required: false
  },
  actualDeliveryDate: {
    type: Date,
    required: false
  },
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  proofOfDelivery: {
    signature: {
      type: String,
      required: false
    },
    photo: {
      type: String,
      required: false
    },
    otp: {
      type: String,
      required: false
    },
    deliveredTo: {
      type: String,
      required: false
    },
    notes: {
      type: String,
      required: false
    }
  },
  failureReason: {
    type: String,
    required: false
  },
  failureNotes: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Generate unique reference number
courierSchema.pre('save', async function(next) {
  if (!this.refNumber) {
    try {
      // Generate a unique reference number
      this.refNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
      console.log(`Generated courier refNumber: ${this.refNumber}`);
    } catch (error) {
      console.error('Error generating refNumber:', error);
      // Fallback to timestamp-based generation
      this.refNumber = `REF${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Courier', courierSchema); 