const mongoose = require('mongoose');

const courierTrackingSchema = new mongoose.Schema({
  courierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Courier',
    required: true
  },
  remark: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Courier Pickup', 'Shipped', 'Intransit', 'Arrived at Destination', 'Out for Delivery', 'Delivered']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CourierTracking', courierTrackingSchema); 