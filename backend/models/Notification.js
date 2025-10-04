const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['booking', 'complaint', 'status_update', 'general'],
    required: true
  },
  relatedId: {
    type: String, // Can be bookingId, complaintId, or courierId
    required: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  metadata: {
    // Additional data specific to notification type
    bookingId: String,
    complaintId: String,
    courierId: String,
    status: String,
    action: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

// Method to mark notification as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  return await notification.save();
};

// Static method to get user notifications with pagination
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  
  const query = { userId };
  if (unreadOnly) {
    query.isRead = false;
  }
  
  const notifications = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();
    
  const total = await this.countDocuments(query);
  
  return {
    notifications,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);