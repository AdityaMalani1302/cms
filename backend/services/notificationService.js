const Notification = require('../models/Notification');

class NotificationService {
  // Create notification for booking courier
  static async createBookingNotification(userId, bookingData) {
    try {
      return await Notification.createNotification({
        userId,
        title: 'Booking Confirmed',
        message: `Your courier booking has been confirmed. Tracking ID: ${bookingData.trackingId}`,
        type: 'booking',
        relatedId: bookingData._id,
        priority: 'medium',
        metadata: {
          bookingId: bookingData._id,
          status: bookingData.status || 'Pending Pickup',
          action: 'booking_created'
        }
      });
    } catch (error) {
      console.error('Error creating booking notification:', error);
      throw error;
    }
  }

  // Create notification for complaint submission
  static async createComplaintNotification(userId, complaintData) {
    try {
      return await Notification.createNotification({
        userId,
        title: 'Complaint Submitted',
        message: `Your complaint has been submitted successfully. Ticket: ${complaintData.ticketNumber}`,
        type: 'complaint',
        relatedId: complaintData._id,
        priority: 'medium',
        metadata: {
          complaintId: complaintData._id,
          status: complaintData.status || 'Open',
          action: 'complaint_created'
        }
      });
    } catch (error) {
      console.error('Error creating complaint notification:', error);
      throw error;
    }
  }

  // Create notification for status updates (booking/courier)
  static async createStatusUpdateNotification(userId, updateData) {
    try {
      const { type, id, oldStatus, newStatus, trackingId, ticketNumber } = updateData;
      
      let title, message, priority = 'medium';
      
      if (type === 'booking' || type === 'courier') {
        title = 'Delivery Status Updated';
        message = `Your package (${trackingId}) status has been updated to: ${newStatus}`;
        
        // Set priority based on status
        if (['Delivered', 'Delivery Failed', 'Pickup Failed'].includes(newStatus)) {
          priority = 'high';
        }
      } else if (type === 'complaint') {
        title = 'Complaint Status Updated';
        message = `Your complaint (${ticketNumber}) status has been updated to: ${newStatus}`;
        
        if (['Resolved', 'Closed'].includes(newStatus)) {
          priority = 'high';
        }
      }

      return await Notification.createNotification({
        userId,
        title,
        message,
        type: 'status_update',
        relatedId: id,
        priority,
        metadata: {
          [type === 'complaint' ? 'complaintId' : 'courierId']: id,
          status: newStatus,
          action: 'status_updated'
        }
      });
    } catch (error) {
      console.error('Error creating status update notification:', error);
      throw error;
    }
  }

  // Create notification for complaint response
  static async createComplaintResponseNotification(userId, complaintData) {
    try {
      return await Notification.createNotification({
        userId,
        title: 'Complaint Response Received',
        message: `Admin has responded to your complaint (${complaintData.ticketNumber})`,
        type: 'complaint',
        relatedId: complaintData._id,
        priority: 'high',
        metadata: {
          complaintId: complaintData._id,
          status: complaintData.status,
          action: 'complaint_responded'
        }
      });
    } catch (error) {
      console.error('Error creating complaint response notification:', error);
      throw error;
    }
  }

  // Get user notifications with pagination
  static async getUserNotifications(userId, options = {}) {
    try {
      return await Notification.getUserNotifications(userId, options);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (notification) {
        return await notification.markAsRead();
      }
      return null;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      return await Notification.markAllAsRead(userId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({ 
        userId, 
        isRead: false 
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Helper method to find user by email (for complaints)
  static async findUserByEmail(email) {
    try {
      const User = require('../models/User');
      return await User.findOne({ email });
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }
}

module.exports = NotificationService;