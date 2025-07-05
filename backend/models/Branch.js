const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 10
  },
  branchName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  branchContactNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15
  },
  branchEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 120
  },
  branchAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  branchCity: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  branchState: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  branchPincode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  branchCountry: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  branchManager: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 15
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120
    }
  },
  operatingHours: {
    openTime: {
      type: String,
      required: true,
      default: '09:00'
    },
    closeTime: {
      type: String,
      required: true,
      default: '18:00'
    },
    workingDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }]
  },
  capacity: {
    maxDailyPackages: {
      type: Number,
      default: 500
    },
    storageCapacity: {
      type: Number,
      default: 1000
    },
    staffCount: {
      type: Number,
      default: 5
    }
  },
  services: [{
    type: String,
    enum: ['Standard Delivery', 'Express Delivery', 'Same Day Delivery', 'International', 'COD', 'Fragile Items']
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  coordinates: {
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    }
  },
  statistics: {
    totalCouriers: {
      type: Number,
      default: 0
    },
    deliveredThisMonth: {
      type: Number,
      default: 0
    },
    pendingDeliveries: {
      type: Number,
      default: 0
    },
    lastStatsUpdate: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Generate unique branch code
branchSchema.pre('save', async function(next) {
  if (!this.branchCode) {
    const count = await this.constructor.countDocuments();
    this.branchCode = `BR${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual for full address
branchSchema.virtual('fullAddress').get(function() {
  return `${this.branchAddress}, ${this.branchCity}, ${this.branchState} ${this.branchPincode}, ${this.branchCountry}`;
});

// Method to update branch statistics
branchSchema.methods.updateStatistics = async function() {
  const Courier = require('./Courier');
  
  const totalCouriers = await Courier.countDocuments({ senderBranch: this.branchName });
  const deliveredThisMonth = await Courier.countDocuments({
    senderBranch: this.branchName,
    status: 'Delivered',
    actualDeliveryDate: {
      $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    }
  });
  const pendingDeliveries = await Courier.countDocuments({
    senderBranch: this.branchName,
    status: { $nin: ['Delivered', 'Pickup Failed', 'Delivery Failed'] }
  });

  this.statistics = {
    totalCouriers,
    deliveredThisMonth,
    pendingDeliveries,
    lastStatsUpdate: new Date()
  };

  await this.save();
};

module.exports = mongoose.model('Branch', branchSchema); 