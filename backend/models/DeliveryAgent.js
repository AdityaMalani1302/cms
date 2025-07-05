const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { validatePasswordComplexity } = require('../utils/passwordValidation');

const deliveryAgentSchema = new mongoose.Schema({
  agentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 20
  },
  agentName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  agentEmail: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 120
  },
  agentPassword: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function(password) {
        const validation = validatePasswordComplexity(password);
        return validation.isValid;
      },
      message: function(props) {
        const validation = validatePasswordComplexity(props.value);
        return validation.errors.join(', ');
      }
    }
  },
  agentMobileNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15
  },
  assignedBranch: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'car', 'van', 'truck', 'bicycle'],
    required: true
  },
  vehicleNumber: {
    type: String,
    required: false,
    trim: true,
    maxlength: 20
  },
  licenseNumber: {
    type: String,
    required: false,
    trim: true,
    maxlength: 30
  },
  // Address information
  address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10
  },
  // Work schedule
  workingHours: {
    startTime: {
      type: String,
      default: '09:00'
    },
    endTime: {
      type: String,
      default: '18:00'
    }
  },
  workingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  // Status and availability
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  currentLocation: {
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Performance metrics
  totalDeliveries: {
    type: Number,
    default: 0
  },
  successfulDeliveries: {
    type: Number,
    default: 0
  },
  failedDeliveries: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  // Emergency contact
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: 120
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: 15
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: 50
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
deliveryAgentSchema.pre('save', async function(next) {
  if (!this.isModified('agentPassword')) {
    return next();
  }
  this.agentPassword = await bcrypt.hash(this.agentPassword, 10);
  next();
});

// Compare password method
deliveryAgentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.agentPassword);
};

// Calculate success rate
deliveryAgentSchema.methods.getSuccessRate = function() {
  if (this.totalDeliveries === 0) return 0;
  return (this.successfulDeliveries / this.totalDeliveries * 100).toFixed(2);
};

// Update location
deliveryAgentSchema.methods.updateLocation = function(latitude, longitude) {
  this.currentLocation = {
    latitude,
    longitude,
    lastUpdated: new Date()
  };
  return this.save();
};

module.exports = mongoose.model('DeliveryAgent', deliveryAgentSchema); 