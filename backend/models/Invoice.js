const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerDetails: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    }
  },
  serviceDetails: {
    description: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      required: true
    },
    packageType: {
      type: String,
      required: true
    },
    deliverySpeed: {
      type: String,
      required: true
    },
    origin: {
      type: String,
      required: true
    },
    destination: {
      type: String,
      required: true
    }
  },
  amounts: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  taxDetails: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 } // Default GST rate
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  pdfPath: {
    type: String
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate unique invoice number before validation
invoiceSchema.pre('validate', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Find the last invoice number for this month
    const lastInvoice = await this.constructor.findOne({
      invoiceNumber: new RegExp(`^INV-${year}${month}`)
    }).sort({ invoiceNumber: -1 });
    
    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.invoiceNumber = `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Indexes for better query performance
invoiceSchema.index({ bookingId: 1 });
invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

// Instance method to mark as paid
invoiceSchema.methods.markAsPaid = function() {
  this.status = 'paid';
  this.paidDate = new Date();
  return this.save();
};

// Instance method to increment download count
invoiceSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  return this.save();
};

module.exports = mongoose.model('Invoice', invoiceSchema); 