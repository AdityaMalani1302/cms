const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { validatePasswordComplexity } = require('../utils/passwordValidation');

const deliveryAgentSchema = new mongoose.Schema({
  agentId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  activePickups: {
    type: Number,
    default: 0
  },
  maxPickups: {
    type: Number,
    default: 10
  },
  area: {
    type: String,
    required: true
  },
  assignedBranch: {
    type: String,
    required: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['bike', 'car', 'van', 'truck', 'bicycle', 'Motorcycle', 'Scooter']
  },
  vehicleNumber: String,
  licenseNumber: String,
  workingHours: {
    startTime: String,
    endTime: String
  },
  workingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  totalPickups: {
    type: Number,
    default: 0
  },
  successfulPickups: {
    type: Number,
    default: 0
  },
  failedPickups: {
    type: Number,
    default: 0
  },
  assignedCouriers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Courier'
  }]
}, {
  timestamps: true
});

// Hash password before saving
deliveryAgentSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
deliveryAgentSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to check if agent can take more pickups
deliveryAgentSchema.methods.canTakePickups = function() {
  return this.status === 'active' && 
         this.isAvailable && 
         this.activePickups < this.maxPickups;
};

// Method to assign courier for pickup
deliveryAgentSchema.methods.assignCourier = function(courierId) {
  if (!this.canTakePickups()) {
    throw new Error('Agent cannot take more pickups at this time');
  }
  
  this.assignedCouriers.push(courierId);
  this.activePickups += 1;
  
  if (this.activePickups >= this.maxPickups) {
    this.isAvailable = false;
  }
  
  return this.save();
};

// Method to complete courier pickup
deliveryAgentSchema.methods.completeCourierPickup = function(courierId, success = true) {
  this.assignedCouriers = this.assignedCouriers.filter(id => !id.equals(courierId));
  this.activePickups -= 1;
  this.totalPickups += 1;
  
  if (success) {
    this.successfulPickups += 1;
  } else {
    this.failedPickups += 1;
  }
  
  if (this.activePickups < this.maxPickups) {
    this.isAvailable = true;
  }
  
  return this.save();
};

const DeliveryAgent = mongoose.model('DeliveryAgent', deliveryAgentSchema);

module.exports = DeliveryAgent; 