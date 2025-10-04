const logger = require('../utils/logger');
const NotificationService = require('./notificationService');

/**
 * Standardized status values for the entire system
 */
const STATUS_VALUES = {
  PENDING_PICKUP: 'pending pickup',
  PICKED_UP: 'picked up',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in transit',
  ARRIVED_AT_DESTINATION: 'arrived at destination',
  OUT_FOR_DELIVERY: 'out for delivery',
  DELIVERED: 'delivered',
  PICKUP_FAILED: 'pickup failed',
  DELIVERY_FAILED: 'delivery failed'
};

/**
 * Human-friendly status labels for display
 */
const STATUS_LABELS = {
  [STATUS_VALUES.PENDING_PICKUP]: 'Pending Pickup',
  [STATUS_VALUES.PICKED_UP]: 'Picked Up',
  [STATUS_VALUES.SHIPPED]: 'Shipped',
  [STATUS_VALUES.IN_TRANSIT]: 'In Transit',
  [STATUS_VALUES.ARRIVED_AT_DESTINATION]: 'Arrived at Destination',
  [STATUS_VALUES.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [STATUS_VALUES.DELIVERED]: 'Delivered',
  [STATUS_VALUES.PICKUP_FAILED]: 'Pickup Failed',
  [STATUS_VALUES.DELIVERY_FAILED]: 'Delivery Failed'
};

/**
 * Status descriptions for notifications
 */
const STATUS_DESCRIPTIONS = {
  [STATUS_VALUES.PENDING_PICKUP]: 'Your package is confirmed and pickup is scheduled',
  [STATUS_VALUES.PICKED_UP]: 'Your package has been picked up from the sender',
  [STATUS_VALUES.SHIPPED]: 'Your package has been shipped from origin',
  [STATUS_VALUES.IN_TRANSIT]: 'Your package is in transit to destination',
  [STATUS_VALUES.ARRIVED_AT_DESTINATION]: 'Your package has arrived at destination facility',
  [STATUS_VALUES.OUT_FOR_DELIVERY]: 'Your package is out for delivery',
  [STATUS_VALUES.DELIVERED]: 'Your package has been delivered successfully',
  [STATUS_VALUES.PICKUP_FAILED]: 'Pickup attempt failed - we will retry',
  [STATUS_VALUES.DELIVERY_FAILED]: 'Delivery attempt failed - we will retry'
};

/**
 * Update booking status and send notifications to all relevant parties
 * @param {String} bookingId - The booking ID
 * @param {String} newStatus - The new status (must be one of STATUS_VALUES)
 * @param {String} updatedBy - Who updated the status (admin/agent ID)
 * @param {String} updatedByType - Type of updater ('admin', 'agent', 'system')
 * @param {String} notes - Optional notes about the status change
 */
const updateBookingStatus = async (bookingId, newStatus, updatedBy, updatedByType = 'system', notes = '') => {
  try {
    const Booking = require('../models/Booking');
    
    // Validate status
    if (!Object.values(STATUS_VALUES).includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate('userId assignedAgent');
    if (!booking) {
      throw new Error('Booking not found');
    }

    const oldStatus = booking.status;
    
    // Update booking status
    booking.status = newStatus;
    await booking.save();

    console.log(`📋 Status updated: ${bookingId} from "${oldStatus}" to "${newStatus}"`);

    // Create notifications for different parties
    const notifications = [];

    // 1. Notification for customer
    if (booking.userId && booking.userId._id) {
      notifications.push({
        userId: booking.userId._id,
        type: 'status_update',
        title: `Package ${STATUS_LABELS[newStatus]}`,
        message: `Your package ${booking.trackingId}: ${STATUS_DESCRIPTIONS[newStatus]}`,
        metadata: {
          bookingId: booking._id,
          trackingId: booking.trackingId,
          status: newStatus,
          oldStatus: oldStatus,
          updatedBy: updatedByType,
          notes: notes
        }
      });
    }

    // 2. Notification for assigned agent (if exists and relevant)
    if (booking.assignedAgent && booking.assignedAgent._id && [STATUS_VALUES.PICKED_UP, STATUS_VALUES.SHIPPED, STATUS_VALUES.IN_TRANSIT, STATUS_VALUES.OUT_FOR_DELIVERY].includes(newStatus)) {
      notifications.push({
        userId: booking.assignedAgent._id,
        type: 'booking_update',
        title: `Booking Status Updated`,
        message: `Booking ${booking.trackingId} status changed to ${STATUS_LABELS[newStatus]}`,
        metadata: {
          bookingId: booking._id,
          trackingId: booking.trackingId,
          status: newStatus,
          oldStatus: oldStatus,
          updatedBy: updatedByType,
          notes: notes
        }
      });
    }

    // 3. System notification for admins on failed deliveries
    if ([STATUS_VALUES.PICKUP_FAILED, STATUS_VALUES.DELIVERY_FAILED].includes(newStatus)) {
      // This would notify all admins - you might want to implement admin notification system
      console.log(`⚠️ Admin attention needed: ${booking.trackingId} - ${newStatus}`);
    }

    // Create notifications using the notification service
    for (const notification of notifications) {
      try {
        await NotificationService.createStatusUpdateNotification(
          notification.userId,
          {
            type: 'booking',
            id: booking._id,
            oldStatus: oldStatus,
            newStatus: newStatus,
            trackingId: booking.trackingId
          }
        );
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        logger.error('Notification creation failed', {
          userId: notification.userId,
          bookingId: booking._id,
          error: notifError.message
        });
      }
    }
    
    console.log(`✅ Status update completed - ${notifications.length} notifications created`);

    return {
      success: true,
      booking: booking,
      oldStatus: oldStatus,
      newStatus: newStatus,
      notificationsCreated: notifications.length
    };

  } catch (error) {
    console.error('❌ Status update failed:', error);
    logger.error('Status update failed', {
      bookingId,
      newStatus,
      updatedBy,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get all valid status values
 */
const getValidStatuses = () => {
  return Object.values(STATUS_VALUES);
};

/**
 * Get human-friendly label for a status
 */
const getStatusLabel = (status) => {
  return STATUS_LABELS[status] || status;
};

/**
 * Get status description
 */
const getStatusDescription = (status) => {
  return STATUS_DESCRIPTIONS[status] || `Status: ${status}`;
};

module.exports = {
  STATUS_VALUES,
  STATUS_LABELS,
  STATUS_DESCRIPTIONS,
  updateBookingStatus,
  getValidStatuses,
  getStatusLabel,
  getStatusDescription
};