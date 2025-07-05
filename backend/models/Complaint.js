const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: false,
    unique: true
  },
  trackingNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  customerInfo: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 15
    }
  },
  complaintCategory: {
    type: String,
    required: true,
    enum: [
      'Delayed Delivery',
      'Damaged Package',
      'Lost Package',
      'Wrong Delivery',
      'Poor Service',
      'Billing Issue',
      'Agent Behavior',
      'Other'
    ]
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  natureOfComplaint: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  issueDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Pending Customer Response', 'Resolved', 'Closed'],
    default: 'Open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  branch: {
    type: String,
    required: false,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: {
    resolutionDetails: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    resolutionType: {
      type: String,
      enum: ['Refund', 'Replacement', 'Compensation', 'Apology', 'Process Improvement', 'Other']
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    resolvedAt: {
      type: Date
    },
    customerSatisfaction: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String
    }
  },
  communicationHistory: [{
    type: {
      type: String,
      enum: ['Internal Note', 'Customer Response', 'Admin Response', 'Email', 'Phone Call']
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  }],
  escalation: {
    isEscalated: {
      type: Boolean,
      default: false
    },
    escalatedAt: {
      type: Date
    },
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    escalationReason: {
      type: String,
      maxlength: 500
    }
  },
  sla: {
    responseTime: {
      type: Number, // in hours
      default: 24
    },
    resolutionTime: {
      type: Number, // in hours
      default: 72
    },
    responseDeadline: {
      type: Date
    },
    resolutionDeadline: {
      type: Date
    },
    isOverdue: {
      type: Boolean,
      default: false
    }
  },
  remark: {
    type: String,
    trim: true,
    maxlength: 500
  },
  updationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate unique ticket number
complaintSchema.pre('save', async function(next) {
  // Always generate a ticket number if it doesn't exist
  if (!this.ticketNumber || this.ticketNumber === '') {
    try {
      // Use timestamp + random for uniqueness
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
      this.ticketNumber = `TKT${timestamp}${random}`;
      console.log(`Generated ticket number: ${this.ticketNumber}`);
    } catch (error) {
      console.error('Error generating ticket number:', error);
      // Fallback to simple timestamp-based generation
      this.ticketNumber = `TKT${Date.now()}`;
      console.log(`Fallback ticket number: ${this.ticketNumber}`);
    }
  }
  
  // Set SLA deadlines
  if (this.isNew) {
    const now = new Date();
    this.sla.responseDeadline = new Date(now.getTime() + (this.sla.responseTime * 60 * 60 * 1000));
    this.sla.resolutionDeadline = new Date(now.getTime() + (this.sla.resolutionTime * 60 * 60 * 1000));
  }
  
  // Check if overdue
  const now = new Date();
  if (this.status !== 'Resolved' && this.status !== 'Closed') {
    this.sla.isOverdue = now > this.sla.resolutionDeadline;
  }
  
  this.updationDate = now;
  next();
});

// Method to add communication entry
complaintSchema.methods.addCommunication = function(type, message, addedBy, isInternal = false) {
  this.communicationHistory.push({
    type,
    message,
    addedBy,
    isInternal
  });
  this.updationDate = new Date();
  return this.save();
};

// Method to escalate complaint
complaintSchema.methods.escalate = function(escalatedBy, reason) {
  this.escalation = {
    isEscalated: true,
    escalatedAt: new Date(),
    escalatedBy,
    escalationReason: reason
  };
  this.priority = this.priority === 'Critical' ? 'Critical' : 'High';
  this.updationDate = new Date();
  return this.save();
};

// Method to resolve complaint
complaintSchema.methods.resolve = function(resolutionDetails, resolutionType, resolvedBy) {
  this.status = 'Resolved';
  this.resolution = {
    resolutionDetails,
    resolutionType,
    resolvedBy,
    resolvedAt: new Date()
  };
  this.updationDate = new Date();
  return this.save();
};

// Virtual for age in days
complaintSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

// Virtual for time until deadline
complaintSchema.virtual('timeUntilDeadline').get(function() {
  const now = new Date();
  const deadline = new Date(this.sla.resolutionDeadline);
  const diffInHours = Math.floor((deadline - now) / (1000 * 60 * 60));
  return diffInHours;
});

module.exports = mongoose.model('Complaint', complaintSchema); 