const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const Notification = require('../models/Notification');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateUser);

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user._id;

    const result = await NotificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      unreadCount: await NotificationService.getUnreadCount(userId)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Get unread notification count only
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await NotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify notification belongs to user
    const notification = await Notification.findOne({ _id: id, userId });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await NotificationService.markAsRead(id);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user._id;
    await NotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify notification belongs to user
    const notification = await Notification.findOne({ _id: id, userId });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

module.exports = router;