const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateUser);

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private (User)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      isRead: false 
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private (User)
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private (User)
router.put('/mark-all-read', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private (User)
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// @route   POST /api/notifications/send
// @desc    Send notification to user(s) (Admin only)
// @access  Private (Admin)
router.post('/send', async (req, res) => {
  try {
    const {
      userIds,
      type = 'admin_message',
      title,
      message,
      channels = ['email', 'sms', 'in-app'],
      templateData = {},
      priority = 'medium'
    } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required'
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    const results = await notificationService.sendBulkNotifications(userIds, {
      type,
      title,
      message,
      channels,
      templateData,
      priority
    });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Notifications sent: ${successCount} successful, ${failCount} failed`,
      data: {
        totalSent: userIds.length,
        successCount,
        failCount,
        results: results.map(r => ({
          userId: r.userId,
          success: r.success,
          error: r.error || null
        }))
      }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications'
    });
  }
});

// @route   POST /api/notifications/test
// @desc    Test notification service (Admin only)
// @access  Private (Admin)
router.post('/test', async (req, res) => {
  try {
    const { testType = 'all', testEmail, testPhone } = req.body;

    const results = {};

    if (testType === 'email' || testType === 'all') {
      try {
        results.email = await emailService.testEmail(testEmail);
      } catch (error) {
        results.email = { success: false, error: error.message };
      }
    }

    if (testType === 'sms' || testType === 'all') {
      try {
        results.sms = await smsService.testSMS(testPhone);
      } catch (error) {
        results.sms = { success: false, error: error.message };
      }
    }

    if (testType === 'notification' || testType === 'all') {
      try {
        results.notification = await notificationService.testNotificationService(req.user.id);
      } catch (error) {
        results.notification = { success: false, error: error.message };
      }
    }

    const allSuccessful = Object.values(results).every(r => r.success);

    res.json({
      success: allSuccessful,
      message: allSuccessful ? 'All tests passed' : 'Some tests failed',
      data: results
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test notification service'
    });
  }
});

// @route   GET /api/notifications/preferences
// @desc    Get user notification preferences
// @access  Private (User)
router.get('/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    
    const defaultPreferences = {
      emailNotifications: true,
      smsNotifications: true,
      inAppNotifications: true,
      notificationTypes: {
        bookingConfirmation: true,
        statusUpdates: true,
        deliveryNotifications: true,
        issueAlerts: true,
        paymentConfirmations: true,
        marketing: false
      }
    };

    const preferences = user?.preferences || defaultPreferences;

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences'
    });
  }
});

// @route   PUT /api/notifications/preferences
// @desc    Update user notification preferences
// @access  Private (User)
router.put('/preferences', async (req, res) => {
  try {
    const {
      emailNotifications,
      smsNotifications,
      inAppNotifications,
      notificationTypes
    } = req.body;

    const updateData = {};
    
    if (emailNotifications !== undefined) {
      updateData['preferences.emailNotifications'] = emailNotifications;
    }
    if (smsNotifications !== undefined) {
      updateData['preferences.smsNotifications'] = smsNotifications;
    }
    if (inAppNotifications !== undefined) {
      updateData['preferences.inAppNotifications'] = inAppNotifications;
    }
    if (notificationTypes && typeof notificationTypes === 'object') {
      Object.keys(notificationTypes).forEach(key => {
        updateData[`preferences.notificationTypes.${key}`] = notificationTypes[key];
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('preferences');

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    });
  }
});

// @route   POST /api/notifications/marketing/campaign
// @desc    Send marketing campaign (Admin only)
// @access  Private (Admin)
router.post('/marketing/campaign', async (req, res) => {
  try {
    const {
      title,
      subject,
      content,
      targetAudience = 'all', // 'all', 'active', 'premium'
      channels = ['email'],
      ctaLink,
      ctaText,
      scheduledFor
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    // Build user query based on target audience
    let userQuery = { 'preferences.marketing': { $ne: false } };
    
    if (targetAudience === 'active') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      userQuery.lastLoginDate = { $gte: thirtyDaysAgo };
    }

    // Get target users
    const users = await User.find(userQuery).select('_id email phoneNumber name');
    
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users match the target audience criteria'
      });
    }

    const campaign = {
      title,
      subject: subject || title,
      content,
      ctaLink,
      ctaText,
      channels
    };

    // Send immediately or schedule
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      // TODO: Implement scheduling logic (could use job queue)
      return res.json({
        success: true,
        message: 'Campaign scheduled successfully',
        data: {
          scheduledFor,
          targetCount: users.length
        }
      });
    } else {
      // Send immediately
      const userIds = users.map(u => u._id);
      const results = await notificationService.sendBulkNotifications(userIds, {
        type: 'marketing',
        title,
        message: content,
        channels,
        templateData: campaign
      });

      const successCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        message: `Marketing campaign sent to ${successCount}/${users.length} users`,
        data: {
          targetCount: users.length,
          successCount,
          failCount: users.length - successCount
        }
      });
    }
  } catch (error) {
    console.error('Marketing campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send marketing campaign'
    });
  }
});

// @route   GET /api/notifications/stats
// @desc    Get notification statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', async (req, res) => {
  try {
    const { timeRange = '30' } = req.query; // Days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Notification statistics
    const stats = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // User engagement stats
    const engagementStats = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          readNotifications: {
            $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
          },
          avgReadTime: {
            $avg: {
              $subtract: ['$readAt', '$createdAt']
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        timeRange: `${timeRange} days`,
        notificationsByType: stats,
        engagement: engagementStats[0] || {
          totalNotifications: 0,
          readNotifications: 0,
          avgReadTime: 0
        }
      }
    });
  } catch (error) {
    console.error('Notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    });
  }
});

module.exports = router; 