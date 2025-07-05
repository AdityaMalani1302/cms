const emailService = require('./emailService');
const smsService = require('./smsService');
const User = require('../models/User');
const Notification = require('../models/Notification');

class NotificationService {
  constructor() {
    this.emailService = emailService;
    this.smsService = smsService;
  }

  // Get user contact information
  async getUserContacts(userId) {
    try {
      const user = await User.findById(userId).select('email phoneNumber name fullName preferences');
      if (!user) {
        throw new Error('User not found');
      }

      return {
        email: user.email,
        phone: user.phoneNumber,
        name: user.name || user.fullName || 'Customer',
        preferences: user.preferences || {}
      };
    } catch (error) {
      console.error('Error getting user contacts:', error);
      return null;
    }
  }

  // Create notification record
  async createNotificationRecord(data) {
    try {
      const notification = new Notification({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        channels: data.channels || ['in-app'],
        metadata: data.metadata || {},
        status: 'sent'
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification record:', error);
      return null;
    }
  }

  // Send notification via multiple channels
  async sendNotification(notificationData) {
    try {
      const {
        userId,
        type,
        title,
        message,
        channels = ['email', 'sms', 'in-app'],
        templateData = {},
        priority = 'medium'
      } = notificationData;

      // Get user contact information
      const userContacts = await this.getUserContacts(userId);
      if (!userContacts) {
        throw new Error('Could not retrieve user contact information');
      }

      const results = {
        email: null,
        sms: null,
        inApp: null,
        success: false,
        errors: []
      };

      // Check user preferences
      const userPrefs = userContacts.preferences || {};
      const emailEnabled = userPrefs.emailNotifications !== false && channels.includes('email');
      const smsEnabled = userPrefs.smsNotifications !== false && channels.includes('sms');
      const inAppEnabled = channels.includes('in-app');

      // Prepare template data
      const mergedData = {
        customerName: userContacts.name,
        ...templateData
      };

      // Send email notification
      if (emailEnabled && userContacts.email) {
        try {
          const emailTemplate = this.getEmailTemplate(type);
          results.email = await this.emailService.sendEmail(
            userContacts.email,
            title,
            emailTemplate,
            mergedData
          );
        } catch (error) {
          results.errors.push(`Email: ${error.message}`);
        }
      }

      // Send SMS notification
      if (smsEnabled && userContacts.phone) {
        try {
          const smsTemplate = this.getSMSTemplate(type);
          results.sms = await this.smsService.sendSMS(
            userContacts.phone,
            null,
            smsTemplate,
            mergedData
          );
        } catch (error) {
          results.errors.push(`SMS: ${error.message}`);
        }
      }

      // Create in-app notification record
      if (inAppEnabled) {
        try {
          results.inApp = await this.createNotificationRecord({
            userId,
            type,
            title,
            message,
            channels,
            metadata: mergedData
          });
        } catch (error) {
          results.errors.push(`In-App: ${error.message}`);
        }
      }

      // Determine overall success
      results.success = (results.email?.success || results.sms?.success || results.inApp) && results.errors.length === 0;

      return results;
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error.message,
        email: null,
        sms: null,
        inApp: null
      };
    }
  }

  // Get email template name based on notification type
  getEmailTemplate(type) {
    const templateMap = {
      'booking_confirmation': 'booking-confirmation',
      'status_update': 'status-update',
      'delivery_notification': 'delivery-notification',
      'issue_alert': 'issue-alert',
      'payment_confirmation': 'payment-confirmation',
      'pickup_scheduled': 'booking-confirmation',
      'marketing': 'marketing'
    };

    return templateMap[type] || 'basic';
  }

  // Get SMS template name based on notification type
  getSMSTemplate(type) {
    const templateMap = {
      'booking_confirmation': 'booking-confirmation',
      'status_update': 'status-update',
      'out_for_delivery': 'out-for-delivery',
      'delivered': 'delivered',
      'delivery_failed': 'delivery-failed',
      'issue_alert': 'issue-alert',
      'payment_confirmation': 'payment-confirmation',
      'pickup_scheduled': 'pickup-scheduled',
      'marketing': 'marketing'
    };

    return templateMap[type] || 'status-update';
  }

  // Send booking confirmation notifications
  async sendBookingConfirmation(userId, booking) {
    return await this.sendNotification({
      userId,
      type: 'booking_confirmation',
      title: `Booking Confirmed - ${booking.trackingId}`,
      message: `Your booking has been confirmed. Tracking ID: ${booking.trackingId}`,
      templateData: {
        trackingId: booking.trackingId,
        refNumber: booking.refNumber,
        pickupAddress: booking.pickupAddress,
        deliveryAddress: booking.deliveryAddress,
        expectedDeliveryDate: booking.expectedDeliveryDate,
        amount: booking.estimatedCost,
        trackingUrl: `${process.env.FRONTEND_URL}/track/${booking.trackingId}`
      }
    });
  }

  // Send status update notifications
  async sendStatusUpdate(userId, courier, oldStatus, newStatus, additionalData = {}) {
    const isDelivered = newStatus === 'Delivered';
    const isOutForDelivery = newStatus === 'Out for Delivery';
    const isDeliveryFailed = newStatus.includes('Failed');

    let notificationType = 'status_update';
    let title = `Package Status Update - ${courier.refNumber}`;
    let message = `Your package status has been updated to: ${newStatus}`;

    if (isDelivered) {
      notificationType = 'delivered';
      title = `Package Delivered - ${courier.refNumber}`;
      message = `Your package has been delivered successfully!`;
    } else if (isOutForDelivery) {
      notificationType = 'out_for_delivery';
      title = `Out for Delivery - ${courier.refNumber}`;
      message = `Your package is out for delivery and will arrive soon!`;
    } else if (isDeliveryFailed) {
      notificationType = 'delivery_failed';
      title = `Delivery Failed - ${courier.refNumber}`;
      message = `Delivery attempt failed. We will retry soon.`;
    }

    return await this.sendNotification({
      userId,
      type: notificationType,
      title,
      message,
      templateData: {
        refNumber: courier.refNumber,
        trackingId: courier.trackingId,
        oldStatus,
        newStatus,
        updateTime: new Date().toLocaleString(),
        trackingUrl: `${process.env.FRONTEND_URL}/track/${courier.refNumber}`,
        deliveryTime: courier.actualDeliveryDate,
        failureReason: additionalData.failureReason,
        agentPhone: additionalData.agentPhone,
        ...additionalData
      }
    });
  }

  // Send delivery notification
  async sendDeliveryNotification(userId, courier, deliveryAgent = null) {
    return await this.sendNotification({
      userId,
      type: 'delivery_notification',
      title: `Package Delivered Successfully - ${courier.refNumber}`,
      message: `Your package has been delivered successfully!`,
      templateData: {
        refNumber: courier.refNumber,
        trackingId: courier.trackingId,
        deliveryDate: courier.actualDeliveryDate || new Date(),
        recipientName: courier.recipientName,
        deliveredBy: deliveryAgent?.agentName || 'Delivery Agent',
        trackingUrl: `${process.env.FRONTEND_URL}/track/${courier.refNumber}`
      }
    });
  }

  // Send issue alert notifications
  async sendIssueAlert(userId, courier, issue) {
    return await this.sendNotification({
      userId,
      type: 'issue_alert',
      title: `Issue Reported - ${courier.refNumber}`,
      message: `An issue has been reported for your package: ${issue.type}`,
      templateData: {
        refNumber: courier.refNumber,
        trackingId: courier.trackingId,
        issueType: issue.type,
        issueDescription: issue.description,
        reportedAt: issue.reportedAt || new Date(),
        supportEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM,
        supportPhone: process.env.SUPPORT_PHONE || '1800-123-4567'
      }
    });
  }

  // Send payment confirmation notifications
  async sendPaymentConfirmation(userId, payment, booking, invoice = null) {
    return await this.sendNotification({
      userId,
      type: 'payment_confirmation',
      title: `Payment Confirmed - ${booking.trackingId}`,
      message: `Your payment of ₹${payment.amount} has been confirmed.`,
      templateData: {
        trackingId: booking.trackingId,
        refNumber: booking.refNumber,
        amount: payment.amount,
        paymentId: payment.razorpayPaymentId,
        paymentDate: payment.completedAt || new Date(),
        invoiceNumber: invoice?.invoiceNumber,
        downloadUrl: invoice ? `${process.env.FRONTEND_URL}/invoice/${invoice._id}` : null
      }
    });
  }

  // Send pickup scheduled notifications
  async sendPickupScheduled(userId, courier) {
    return await this.sendNotification({
      userId,
      type: 'pickup_scheduled',
      title: `Pickup Scheduled - ${courier.refNumber}`,
      message: `Pickup has been scheduled for your package.`,
      templateData: {
        refNumber: courier.refNumber,
        trackingId: courier.trackingId,
        pickupDate: courier.pickupDate,
        pickupAddress: courier.senderAddress || courier.pickupAddress
      }
    });
  }

  // Send marketing notifications
  async sendMarketing(userId, campaign) {
    return await this.sendNotification({
      userId,
      type: 'marketing',
      title: campaign.subject || campaign.title,
      message: campaign.content,
      channels: campaign.channels || ['email'],
      templateData: {
        campaignTitle: campaign.title,
        campaignContent: campaign.content,
        ctaLink: campaign.ctaLink,
        ctaText: campaign.ctaText || 'Learn More'
      }
    });
  }

  // Send bulk notifications
  async sendBulkNotifications(userIds, notificationData) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendNotification({
          ...notificationData,
          userId
        });
        results.push({ userId, ...result });
        
        // Add delay to avoid overwhelming services
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Send notification to admin/agents
  async sendAdminNotification(adminEmails, title, message, data = {}) {
    const results = [];
    
    for (const email of adminEmails) {
      try {
        const result = await this.emailService.sendEmail(
          email,
          title,
          'basic',
          { message, ...data }
        );
        results.push({ email, ...result });
      } catch (error) {
        results.push({
          email,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Test notification service
  async testNotificationService(userId) {
    try {
      const testNotification = {
        userId,
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification from CMS.',
        templateData: {
          testData: 'Test successful!'
        }
      };

      return await this.sendNotification(testNotification);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService; 