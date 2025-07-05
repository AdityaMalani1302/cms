const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

class SMSService {
  constructor() {
    this.client = null;
    this.templates = new Map();
    this.init();
  }

  // Initialize Twilio client
  init() {
    try {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log('⚠️  Twilio credentials not configured. SMS service disabled.');
        return;
      }

      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      console.log('✅ SMS service initialized successfully');
      
      // Load SMS templates
      this.loadTemplates();
    } catch (error) {
      console.error('❌ SMS service initialization failed:', error.message);
    }
  }

  // Load SMS templates
  loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/sms');
      
      // Ensure templates directory exists
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Define default templates
      const defaultTemplates = {
        'booking-confirmation': 'CMS Alert: Booking confirmed! Tracking ID: {{trackingId}}. Expected delivery: {{expectedDeliveryDate}}. Track: {{trackingUrl}}',
        
        'status-update': 'CMS Update: Package {{refNumber}} status changed to {{newStatus}}. Track: {{trackingUrl}}',
        
        'out-for-delivery': 'CMS Alert: Your package {{refNumber}} is out for delivery! Expect delivery today. Contact delivery agent: {{agentPhone}}',
        
        'delivered': 'CMS Success: Package {{refNumber}} delivered successfully at {{deliveryTime}}. Thank you for using CMS!',
        
        'delivery-failed': 'CMS Alert: Delivery attempt failed for package {{refNumber}}. Reason: {{failureReason}}. We will retry tomorrow.',
        
        'issue-alert': 'CMS Alert: Issue reported for package {{refNumber}}. Type: {{issueType}}. Our team is investigating. Support: {{supportPhone}}',
        
        'payment-confirmation': 'CMS Payment: Payment of ₹{{amount}} confirmed for booking {{trackingId}}. Transaction ID: {{paymentId}}',
        
        'pickup-scheduled': 'CMS Alert: Pickup scheduled for {{pickupDate}}. Package {{refNumber}} will be collected from {{pickupAddress}}',
        
        'marketing': 'CMS Offer: {{campaignTitle}} - {{campaignContent}} Reply STOP to unsubscribe.'
      };

      // Load templates from files or use defaults
      Object.entries(defaultTemplates).forEach(([templateName, defaultContent]) => {
        const templatePath = path.join(templatesDir, `${templateName}.txt`);
        
        let templateContent = defaultContent;
        if (fs.existsSync(templatePath)) {
          templateContent = fs.readFileSync(templatePath, 'utf8').trim();
        } else {
          // Create default template file
          fs.writeFileSync(templatePath, defaultContent);
        }
        
        this.templates.set(templateName, templateContent);
      });

      console.log(`📱 Loaded ${this.templates.size} SMS templates`);
    } catch (error) {
      console.error('Error loading SMS templates:', error);
    }
  }

  // Replace template variables
  parseTemplate(template, data) {
    let message = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacementValue = value || '';
      message = message.replace(new RegExp(placeholder, 'g'), replacementValue);
    });

    // Remove any unreplaced placeholders
    message = message.replace(/\{\{[^}]+\}\}/g, '');
    
    return message.trim();
  }

  // Send SMS
  async sendSMS(to, message, templateName = null, data = {}) {
    try {
      if (!this.client) {
        console.log('SMS service not available');
        return { success: false, error: 'SMS service not configured' };
      }

      // Format phone number (ensure it starts with +91 for India)
      let formattedPhone = to.toString().replace(/\D/g, '');
      if (formattedPhone.length === 10) {
        formattedPhone = '+91' + formattedPhone;
      } else if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
        formattedPhone = '+' + formattedPhone;
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      // Use template if provided
      if (templateName && this.templates.has(templateName)) {
        message = this.parseTemplate(this.templates.get(templateName), data);
      }

      // Ensure message is not too long (SMS limit is 160 chars for single SMS)
      if (message.length > 160) {
        message = message.substring(0, 157) + '...';
      }

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`📱 SMS sent successfully to ${formattedPhone}`);
      
      return {
        success: true,
        messageId: result.sid,
        to: formattedPhone,
        message: message.substring(0, 50) + '...'
      };
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
        to,
        message
      };
    }
  }

  // Send booking confirmation SMS
  async sendBookingConfirmation(phone, booking) {
    const data = {
      trackingId: booking.trackingId,
      refNumber: booking.refNumber,
      expectedDeliveryDate: new Date(booking.expectedDeliveryDate).toLocaleDateString(),
      trackingUrl: `${process.env.FRONTEND_URL}/track/${booking.refNumber || booking.trackingId}`
    };

    return await this.sendSMS(phone, null, 'booking-confirmation', data);
  }

  // Send status update SMS
  async sendStatusUpdate(phone, courier, newStatus) {
    const data = {
      refNumber: courier.refNumber,
      trackingId: courier.trackingId,
      newStatus,
      trackingUrl: `${process.env.FRONTEND_URL}/track/${courier.refNumber || courier.trackingId}`
    };

    return await this.sendSMS(phone, null, 'status-update', data);
  }

  // Send out for delivery SMS
  async sendOutForDelivery(phone, courier, agent) {
    const data = {
      refNumber: courier.refNumber,
      agentPhone: agent?.agentMobileNumber || process.env.SUPPORT_PHONE || 'Contact Support',
      trackingUrl: `${process.env.FRONTEND_URL}/track/${courier.refNumber}`
    };

    return await this.sendSMS(phone, null, 'out-for-delivery', data);
  }

  // Send delivery confirmation SMS
  async sendDeliveryConfirmation(phone, courier) {
    const data = {
      refNumber: courier.refNumber,
      deliveryTime: new Date(courier.actualDeliveryDate || new Date()).toLocaleString()
    };

    return await this.sendSMS(phone, null, 'delivered', data);
  }

  // Send delivery failed SMS
  async sendDeliveryFailed(phone, courier, failureReason) {
    const data = {
      refNumber: courier.refNumber,
      failureReason: failureReason || 'Recipient unavailable'
    };

    return await this.sendSMS(phone, null, 'delivery-failed', data);
  }

  // Send issue alert SMS
  async sendIssueAlert(phone, courier, issue) {
    const data = {
      refNumber: courier.refNumber,
      issueType: issue.type,
      supportPhone: process.env.SUPPORT_PHONE || '1800-123-4567'
    };

    return await this.sendSMS(phone, null, 'issue-alert', data);
  }

  // Send payment confirmation SMS
  async sendPaymentConfirmation(phone, payment, booking) {
    const data = {
      amount: payment.amount,
      trackingId: booking.trackingId,
      paymentId: payment.razorpayPaymentId
    };

    return await this.sendSMS(phone, null, 'payment-confirmation', data);
  }

  // Send pickup scheduled SMS
  async sendPickupScheduled(phone, courier) {
    const data = {
      refNumber: courier.refNumber,
      pickupDate: new Date(courier.pickupDate).toLocaleDateString(),
      pickupAddress: courier.senderAddress || courier.pickupAddress?.street
    };

    return await this.sendSMS(phone, null, 'pickup-scheduled', data);
  }

  // Send marketing SMS
  async sendMarketingSMS(phone, campaign) {
    const data = {
      campaignTitle: campaign.title,
      campaignContent: campaign.content
    };

    return await this.sendSMS(phone, null, 'marketing', data);
  }

  // Send bulk SMS
  async sendBulkSMS(recipients, templateName, data = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      const personalizedData = { ...data, ...recipient };
      const result = await this.sendSMS(recipient.phone, null, templateName, personalizedData);
      results.push(result);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  // Send OTP SMS
  async sendOTP(phone, otp, purpose = 'verification') {
    const message = `Your CMS ${purpose} OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
    
    return await this.sendSMS(phone, message);
  }

  // Test SMS service
  async testSMS(testPhone = process.env.TEST_PHONE) {
    if (!testPhone) {
      return { success: false, error: 'No test phone number configured' };
    }

    const testMessage = 'This is a test SMS from CMS. SMS service is working correctly!';
    return await this.sendSMS(testPhone, testMessage);
  }
}

// Create singleton instance
const smsService = new SMSService();

module.exports = smsService; 