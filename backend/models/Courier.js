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
    enum: [
      'pending pickup',
      'picked up',
      'shipped', 
      'in transit',
      'arrived at destination',
      'out for delivery',
      'delivered',
      'pickup failed',
      'delivery failed'
    ],
    default: 'pending pickup'
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
  },
  // Enhanced tracking system
  trackingHistory: [{
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
      required: false
    },
    description: {
      type: String,
      required: false
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAgent',
      required: false
    },
    agentName: {
      type: String,
      required: false
    }
  }],
  estimatedDeliveryTime: {
    type: String,
    required: false // e.g., "Today by 8PM", "Tomorrow by 6PM"
  },
  currentLocation: {
    type: String,
    required: false
  },
  nextUpdate: {
    type: String,
    required: false
  },
  // GPS coordinates for pickup and delivery locations
  pickupCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    }
  },
  deliveryCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    }
  },
  // Enhanced tracking with GPS support
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
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false
      }
    },
    address: {
      type: String,
      required: false
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    userType: {
      type: String,
      enum: ['admin', 'deliveryAgent', 'customer'],
      required: false
    },
    notes: {
      type: String,
      required: false
    }
  }],
  // Real-time tracking fields
  deliveryAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryAgent',
    required: false
  },
  trackingId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  preferredDeliveryTime: {
    type: Date,
    required: false
  },
  lastETAUpdate: {
    type: Date,
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // COD (Cash on Delivery) fields
  codAmount: {
    type: Number,
    required: false,
    min: 0
  },
  codReceived: {
    type: Boolean,
    default: false
  },
  codReceivedAt: {
    type: Date,
    required: false
  },
  codReceivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryAgent',
    required: false
  }
}, {
  timestamps: true
});

// Handle tracking history and status changes
courierSchema.pre('save', async function(next) {
  // Note: refNumber generation is now handled by beforeCreate hook in routeConfigs.js
  // This avoids conflicts with the generic controller's beforeCreate logic

  // Track status changes
  if (this.isModified('status') && this.status) {
    const statusDescriptions = {
      'pending pickup': 'Order confirmed and pickup scheduled',
      'picked up': 'Package has been picked up from sender',
      'shipped': 'Package has been shipped from origin',
      'in transit': 'Package is in transit to destination',
      'arrived at destination': 'Package has arrived at destination facility',
      'out for delivery': 'Package is out for delivery',
      'delivered': 'Package has been delivered successfully',
      'pickup failed': 'Pickup attempt failed',
      'delivery failed': 'Delivery attempt failed'
    };

    // Initialize tracking history if it doesn't exist
    if (!this.trackingHistory) {
      this.trackingHistory = [];
    }

    // Add new tracking entry
    this.trackingHistory.push({
      status: this.status,
      timestamp: new Date(),
      location: this.currentLocation || this.recipientCity,
      description: statusDescriptions[this.status] || `Status updated to ${this.status}`,
      agentId: this.assignedAgent,
      agentName: this.assignedAgentName
    });

    // Update estimated delivery time based on status
    this.estimatedDeliveryTime = this.getEstimatedDeliveryTime();
  }

  next();
});

// Method to get estimated delivery time
courierSchema.methods.getEstimatedDeliveryTime = function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  switch (this.status) {
    case 'Courier Pickup':
      return 'Pickup within 24 hours';
    case 'Shipped':
    case 'Intransit':
      if (this.expectedDeliveryDate) {
        const deliveryDate = new Date(this.expectedDeliveryDate);
        if (deliveryDate.toDateString() === today.toDateString()) {
          return 'Today by 8PM';
        } else if (deliveryDate.toDateString() === tomorrow.toDateString()) {
          return 'Tomorrow by 8PM';
        } else {
          return deliveryDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          });
        }
      }
      return 'Within 3-5 business days';
    case 'Arrived at Destination':
      return 'Tomorrow by 8PM';
    case 'Out for Delivery':
      return 'Today by 8PM';
    case 'Delivered':
      return 'Delivered';
    default:
      return 'Processing';
  }
};

module.exports = mongoose.model('Courier', courierSchema); 