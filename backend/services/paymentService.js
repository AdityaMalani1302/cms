const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFKit = require('pdfkit');
const fs = require('fs');
const path = require('path');

const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

class PaymentService {
  // Create Razorpay order
  static async createOrder(bookingId, userId, amount, currency = 'INR') {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const options = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt: `booking_${bookingId}_${Date.now()}`,
        payment_capture: 1
      };

      const order = await razorpay.orders.create(options);

      // Create payment record
      const payment = new Payment({
        bookingId,
        userId,
        razorpayOrderId: order.id,
        amount,
        currency,
        paymentMethod: 'online'
      });

      await payment.save();

      // Update booking with payment details
      booking.paymentDetails.razorpayOrderId = order.id;
      booking.paymentDetails.paymentId = payment._id;
      booking.paymentDetails.amount = amount;
      booking.paymentDetails.paymentMethod = 'online';
      await booking.save();

      return {
        orderId: order.id,
        amount,
        currency,
        paymentId: payment._id
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  // Verify payment signature
  static verifyPaymentSignature(orderId, paymentId, signature) {
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');
    
    return generatedSignature === signature;
  }

  // Process payment completion
  static async completePayment(orderId, paymentId, signature, userId) {
    try {
      // Verify signature
      if (!this.verifyPaymentSignature(orderId, paymentId, signature)) {
        throw new Error('Invalid payment signature');
      }

      // Find payment record
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Update payment status
      await payment.markCompleted(paymentId, signature);

      // Update booking status
      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        booking.paymentDetails.paymentStatus = 'completed';
        booking.status = 'Pending Pickup';
        await booking.save();
      }

      // Create transaction record
      const transaction = new Transaction({
        paymentId: payment._id,
        bookingId: payment.bookingId,
        userId,
        type: 'payment',
        amount: payment.amount,
        method: 'razorpay',
        gatewayTransactionId: paymentId,
        description: `Payment for booking ${booking.trackingId}`,
        fees: {
          gateway: Math.round(payment.amount * 0.02), // 2% gateway fee
          total: Math.round(payment.amount * 0.02)
        }
      });

      await transaction.markCompleted(paymentId, { orderId, signature });

      // Generate invoice
      const invoice = await this.generateInvoice(payment._id, booking, userId);

      return {
        success: true,
        payment,
        booking,
        invoice
      };
    } catch (error) {
      console.error('Error completing payment:', error);
      throw error;
    }
  }

  // Handle payment failure
  static async handlePaymentFailure(orderId, reason, userId) {
    try {
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment) {
        throw new Error('Payment record not found');
      }

      await payment.markFailed(reason);

      // Update booking status
      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        booking.paymentDetails.paymentStatus = 'failed';
        booking.status = 'Payment Failed';
        await booking.save();
      }

      return { success: true, payment, booking };
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }

  // Generate invoice PDF
  static async generateInvoice(paymentId, booking, userId) {
    try {
      const payment = await Payment.findById(paymentId).populate('userId');
      if (!payment) {
        throw new Error('Payment not found');
      }

      const user = payment.userId;

      // Create invoice record
      const invoice = new Invoice({
        paymentId,
        bookingId: booking._id,
        userId,
        customerDetails: {
          name: user.name || user.fullName,
          email: user.email,
          phone: user.phoneNumber,
          address: {
            street: booking.pickupAddress.street,
            city: booking.pickupAddress.city,
            state: booking.pickupAddress.state,
            pincode: booking.pickupAddress.pincode,
            country: booking.pickupAddress.country
          }
        },
        serviceDetails: {
          description: `Courier service from ${booking.pickupAddress.city} to ${booking.deliveryAddress.city}`,
          weight: booking.weight,
          packageType: booking.packageType,
          deliverySpeed: booking.deliverySpeed,
          origin: `${booking.pickupAddress.city}, ${booking.pickupAddress.state}`,
          destination: `${booking.deliveryAddress.city}, ${booking.deliveryAddress.state}`
        },
        amounts: {
          subtotal: payment.amount,
          tax: Math.round(payment.amount * 0.18), // 18% GST
          total: payment.amount
        },
        taxDetails: {
          cgst: Math.round(payment.amount * 0.09), // 9% CGST
          sgst: Math.round(payment.amount * 0.09), // 9% SGST
          taxRate: 18
        },
        dueDate: new Date(),
        status: 'paid'
      });

      await invoice.save();

      // Generate PDF
      const pdfPath = await this.generateInvoicePDF(invoice);
      invoice.pdfPath = pdfPath;
      await invoice.save();

      // Update booking with invoice reference
      booking.paymentDetails.invoiceId = invoice._id;
      await booking.save();

      return invoice;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  // Generate PDF file
  static async generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
      try {
        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '../uploads/invoices');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `invoice_${invoice.invoiceNumber}.pdf`;
        const filePath = path.join(uploadsDir, fileName);

        const doc = new PDFKit({ margin: 50 });
        doc.pipe(fs.createWriteStream(filePath));

        // Header
        doc.fontSize(20).text('INVOICE', 50, 50);
        doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`, 400, 50);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 65);

        // Company details
        doc.fontSize(14).text('CMS - Courier Management System', 50, 100);
        doc.fontSize(10).text('Address: 123 Business Street, City, State - 123456', 50, 120);
        doc.text('Phone: +91 9876543210 | Email: billing@cms.com', 50, 135);

        // Customer details
        doc.fontSize(12).text('Bill To:', 50, 180);
        doc.fontSize(10).text(invoice.customerDetails.name, 50, 200);
        doc.text(invoice.customerDetails.email, 50, 215);
        doc.text(invoice.customerDetails.phone, 50, 230);

        // Service details
        doc.fontSize(12).text('Service Details:', 50, 270);
        doc.fontSize(10).text(`Description: ${invoice.serviceDetails.description}`, 50, 290);
        doc.text(`Package Type: ${invoice.serviceDetails.packageType}`, 50, 305);
        doc.text(`Weight: ${invoice.serviceDetails.weight} kg`, 50, 320);
        doc.text(`Delivery Speed: ${invoice.serviceDetails.deliverySpeed}`, 50, 335);
        doc.text(`Route: ${invoice.serviceDetails.origin} → ${invoice.serviceDetails.destination}`, 50, 350);

        // Amount details
        doc.fontSize(12).text('Amount Details:', 50, 390);
        doc.fontSize(10).text(`Subtotal: ₹${invoice.amounts.subtotal}`, 50, 410);
        doc.text(`CGST (9%): ₹${invoice.taxDetails.cgst}`, 50, 425);
        doc.text(`SGST (9%): ₹${invoice.taxDetails.sgst}`, 50, 440);
        doc.fontSize(12).text(`Total: ₹${invoice.amounts.total}`, 50, 460);

        // Footer
        doc.fontSize(8).text('Thank you for choosing CMS!', 50, 700);
        doc.text('This is a computer-generated invoice.', 50, 715);

        doc.end();

        doc.on('end', () => {
          resolve(`uploads/invoices/${fileName}`);
        });

        doc.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Process refund
  static async processRefund(paymentId, amount, reason, processedBy) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Cannot refund incomplete payment');
      }

      // Create refund transaction
      const transaction = new Transaction({
        paymentId,
        bookingId: payment.bookingId,
        userId: payment.userId,
        type: 'refund',
        amount: amount,
        method: 'razorpay',
        description: `Refund for booking - ${reason}`,
        processedBy
      });

      await transaction.save();

      // Update payment
      payment.refundAmount = amount;
      payment.refundReason = reason;
      payment.status = 'refunded';
      await payment.save();

      return { success: true, transaction, payment };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }
}

module.exports = PaymentService; 