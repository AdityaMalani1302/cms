const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.init();
  }

  // Initialize email transporter
  async init() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: process.env.MAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
      
      // Load email templates
      await this.loadTemplates();
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
    }
  }

  // Load email templates
  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/email');
      
      // Ensure templates directory exists
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const templateFiles = [
        'booking-confirmation.hbs',
        'status-update.hbs',
        'delivery-notification.hbs',
        'issue-alert.hbs',
        'payment-confirmation.hbs',
        'marketing.hbs'
      ];

      for (const templateFile of templateFiles) {
        const templatePath = path.join(templatesDir, templateFile);
        
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          const templateName = path.basename(templateFile, '.hbs');
          this.templates.set(templateName, handlebars.compile(templateContent));
        }
      }

      console.log(`📧 Loaded ${this.templates.size} email templates`);
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  }

  // Send email
  async sendEmail(to, subject, templateName, data = {}, attachments = []) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      let html = '';
      let text = '';

      // Use template if available
      if (this.templates.has(templateName)) {
        html = this.templates.get(templateName)(data);
        // Generate text version from HTML (basic)
        text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } else {
        // Fallback to basic template
        html = this.generateBasicTemplate(subject, data.message || 'No content');
        text = data.message || 'No content';
      }

      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || 'CMS'} <${process.env.EMAIL_FROM || process.env.MAIL_USER}>`,
        to,
        subject,
        text,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${to}`);
      
      return {
        success: true,
        messageId: result.messageId,
        to,
        subject
      };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
        to,
        subject
      };
    }
  }

  // Generate basic HTML template
  generateBasicTemplate(subject, message) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CMS - Courier Management System</h1>
            </div>
            <div class="content">
                <h2>${subject}</h2>
                <p>${message}</p>
            </div>
            <div class="footer">
                <p>Thank you for using CMS!</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  // Send booking confirmation email
  async sendBookingConfirmation(userEmail, booking) {
    const data = {
      customerName: booking.customerName || 'Customer',
      trackingId: booking.trackingId,
      refNumber: booking.refNumber,
      pickupAddress: booking.pickupAddress,
      deliveryAddress: booking.deliveryAddress,
      expectedDeliveryDate: booking.expectedDeliveryDate,
      amount: booking.estimatedCost || booking.amount,
      bookingDate: new Date().toLocaleDateString()
    };

    return await this.sendEmail(
      userEmail,
      `Booking Confirmation - ${booking.trackingId}`,
      'booking-confirmation',
      data
    );
  }

  // Send status update email
  async sendStatusUpdate(userEmail, courier, oldStatus, newStatus) {
    const data = {
      customerName: courier.customerName || 'Customer',
      refNumber: courier.refNumber,
      trackingId: courier.trackingId,
      oldStatus,
      newStatus,
      updateTime: new Date().toLocaleString(),
      trackingUrl: `${process.env.FRONTEND_URL}/track/${courier.refNumber || courier.trackingId}`
    };

    return await this.sendEmail(
      userEmail,
      `Package Status Update - ${courier.refNumber}`,
      'status-update',
      data
    );
  }

  // Send delivery notification
  async sendDeliveryNotification(userEmail, courier) {
    const data = {
      customerName: courier.customerName || 'Customer',
      refNumber: courier.refNumber,
      trackingId: courier.trackingId,
      deliveryDate: courier.actualDeliveryDate || new Date(),
      recipientName: courier.recipientName,
      deliveredBy: courier.deliveredBy?.agentName || 'Delivery Agent'
    };

    return await this.sendEmail(
      userEmail,
      `Package Delivered Successfully - ${courier.refNumber}`,
      'delivery-notification',
      data
    );
  }

  // Send issue alert email
  async sendIssueAlert(userEmail, courier, issue) {
    const data = {
      customerName: courier.customerName || 'Customer',
      refNumber: courier.refNumber,
      trackingId: courier.trackingId,
      issueType: issue.type,
      issueDescription: issue.description,
      reportedAt: issue.reportedAt || new Date(),
      supportEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM
    };

    return await this.sendEmail(
      userEmail,
      `Issue Reported for Package - ${courier.refNumber}`,
      'issue-alert',
      data
    );
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(userEmail, payment, booking, invoice) {
    const data = {
      customerName: booking.customerName || 'Customer',
      trackingId: booking.trackingId,
      refNumber: booking.refNumber,
      amount: payment.amount,
      paymentId: payment.razorpayPaymentId,
      paymentDate: payment.completedAt || new Date(),
      invoiceNumber: invoice?.invoiceNumber,
      downloadUrl: invoice ? `${process.env.FRONTEND_URL}/invoice/${invoice._id}` : null
    };

    const attachments = [];
    if (invoice && invoice.pdfPath) {
      attachments.push({
        filename: `invoice_${invoice.invoiceNumber}.pdf`,
        path: path.join(__dirname, '..', invoice.pdfPath)
      });
    }

    return await this.sendEmail(
      userEmail,
      `Payment Confirmation - ${booking.trackingId}`,
      'payment-confirmation',
      data,
      attachments
    );
  }

  // Send marketing email
  async sendMarketingEmail(userEmail, campaign) {
    const data = {
      customerName: campaign.customerName || 'Valued Customer',
      campaignTitle: campaign.title,
      campaignContent: campaign.content,
      ctaLink: campaign.ctaLink,
      ctaText: campaign.ctaText || 'Learn More',
      unsubscribeLink: `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(userEmail)}`
    };

    return await this.sendEmail(
      userEmail,
      campaign.subject,
      'marketing',
      data
    );
  }

  // Send bulk emails
  async sendBulkEmails(recipients, subject, templateName, data = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      const personalizedData = { ...data, ...recipient };
      const result = await this.sendEmail(recipient.email, subject, templateName, personalizedData);
      results.push(result);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  // Test email service
  async testEmail(testEmail = process.env.MAIL_USER) {
    try {
      const testData = {
        message: 'This is a test email from CMS Email Service. If you receive this, the email service is working correctly!'
      };

      return await this.sendEmail(
        testEmail,
        'CMS Email Service Test',
        'test',
        testData
      );
    } catch (error) {
      console.error('Email test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService; 