const mongoose = require('mongoose');
const Courier = require('../models/Courier');
const User = require('../models/User');
const DeliveryAgent = require('../models/DeliveryAgent');
const Branch = require('../models/Branch');
const Notification = require('../models/Notification');
const emailService = require('./emailService');
const smsService = require('./smsService');
const notificationService = require('./notificationService');

class CustomerExperienceService {
  constructor() {
    this.deliverySlots = [
      { id: 'morning', label: 'Morning (9 AM - 12 PM)', startHour: 9, endHour: 12 },
      { id: 'afternoon', label: 'Afternoon (12 PM - 4 PM)', startHour: 12, endHour: 16 },
      { id: 'evening', label: 'Evening (4 PM - 8 PM)', startHour: 16, endHour: 20 },
      { id: 'flexible', label: 'Flexible (Any time)', startHour: 9, endHour: 20 }
    ];



    this.priorityLevels = {
      'standard': { multiplier: 1, description: 'Standard delivery (3-5 days)' },
      'express': { multiplier: 1.5, description: 'Express delivery (1-2 days)' },
      'urgent': { multiplier: 2, description: 'Urgent delivery (Same day)' }
    };
  }

  // Multiple package booking with validation
  async createMultipleBookings(userId, bookingsData, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const createdBookings = [];
      let totalCost = 0;

      // Validate and process each booking
      for (let i = 0; i < bookingsData.length; i++) {
        const bookingData = bookingsData[i];
        
        // Validate booking data
        const validation = await this.validateBookingData(bookingData);
        if (!validation.isValid) {
          throw new Error(`Booking ${i + 1}: ${validation.errors.join(', ')}`);
        }

        // Calculate costs including priority and additional services
        const costCalculation = await this.calculateBookingCost(bookingData);
        
        // Create booking object
        const booking = {
          ...bookingData,
          userId,
          trackingNumber: await this.generateTrackingNumber(),
          estimatedCost: costCalculation.totalCost,
          costBreakdown: costCalculation.breakdown,
          status: 'Pending',
          createdAt: new Date(),
          bookingGroup: options.groupId || new mongoose.Types.ObjectId(),
          isMultipleBooking: bookingsData.length > 1
        };

        // Handle scheduled delivery
        if (bookingData.scheduledDelivery) {
          booking.scheduledPickupDate = bookingData.scheduledDelivery.pickupDate;
          booking.scheduledDeliveryDate = bookingData.scheduledDelivery.deliveryDate;
          booking.preferredTimeSlot = bookingData.scheduledDelivery.timeSlot;
        }

        const createdBooking = new Courier(booking);
        await createdBooking.save({ session });
        
        createdBookings.push(createdBooking);
        totalCost += costCalculation.totalCost;
      }

      await session.commitTransaction();

      // Send notifications
      await this.sendMultipleBookingConfirmation(user, createdBookings, totalCost);

      return {
        success: true,
        message: `${createdBookings.length} bookings created successfully`,
        data: {
          bookings: createdBookings,
          totalCost,
          groupId: createdBookings[0].bookingGroup
        }
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Validate booking data
  async validateBookingData(bookingData) {
    const errors = [];

    // Required fields validation
    const requiredFields = [
      'senderName', 'senderAddress', 'senderPhone',
      'recipientName', 'recipientAddress', 'recipientPhone',
      'packageType', 'weight', 'dimensions'
    ];

    requiredFields.forEach(field => {
      if (!bookingData[field]) {
        errors.push(`${field} is required`);
      }
    });

    // Phone number validation
    if (bookingData.senderPhone && !/^\+?[\d\s-()]{10,15}$/.test(bookingData.senderPhone)) {
      errors.push('Invalid sender phone number');
    }

    if (bookingData.recipientPhone && !/^\+?[\d\s-()]{10,15}$/.test(bookingData.recipientPhone)) {
      errors.push('Invalid recipient phone number');
    }

    // Weight and dimension validation
    if (bookingData.weight && (bookingData.weight <= 0 || bookingData.weight > 50)) {
      errors.push('Weight must be between 0.1 kg and 50 kg');
    }

    // Scheduled delivery validation
    if (bookingData.scheduledDelivery) {
      const { pickupDate, deliveryDate, timeSlot } = bookingData.scheduledDelivery;
      
      if (pickupDate && new Date(pickupDate) < new Date()) {
        errors.push('Pickup date cannot be in the past');
      }

      if (deliveryDate && new Date(deliveryDate) <= new Date(pickupDate)) {
        errors.push('Delivery date must be after pickup date');
      }

      if (timeSlot && !this.deliverySlots.find(slot => slot.id === timeSlot)) {
        errors.push('Invalid delivery time slot');
      }
    }



    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate booking cost with priority and additional services
  async calculateBookingCost(bookingData) {
    const baseCost = await this.calculateBaseCost(bookingData);
    const breakdown = {
      baseCost,
      priorityCost: 0,
      additionalServices: 0,
      taxes: 0
    };

    // Priority cost
    if (bookingData.priority && bookingData.priority !== 'standard') {
      const priorityLevel = this.priorityLevels[bookingData.priority];
      breakdown.priorityCost = baseCost * (priorityLevel.multiplier - 1);
    }

    // Additional services
    if (bookingData.additionalServices) {
      if (bookingData.additionalServices.fragileHandling) {
        breakdown.additionalServices += 50;
      }
      if (bookingData.additionalServices.signatureRequired) {
        breakdown.additionalServices += 25;
      }
      if (bookingData.additionalServices.packagePhotos) {
        breakdown.additionalServices += 30;
      }
    }

    // Calculate subtotal
    const subtotal = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0);
    
    // Taxes (18% GST)
    breakdown.taxes = subtotal * 0.18;
    
    const totalCost = subtotal + breakdown.taxes;

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      breakdown
    };
  }

  // Calculate base cost (simplified)
  async calculateBaseCost(bookingData) {
    const weightCost = bookingData.weight * 20; // ₹20 per kg
    const distanceCost = 50; // Base distance cost (would calculate actual distance in real implementation)
    const volumeCost = bookingData.dimensions ? 
      (bookingData.dimensions.length * bookingData.dimensions.width * bookingData.dimensions.height) * 0.001 : 0;

    return Math.max(100, weightCost + distanceCost + volumeCost); // Minimum ₹100
  }

  // Generate unique tracking number
  async generateTrackingNumber() {
    const prefix = 'CMS';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Get available delivery slots for a date
  async getAvailableDeliverySlots(date, location) {
    try {
      const selectedDate = new Date(date);
      const today = new Date();
      
      if (selectedDate < today) {
        return [];
      }

      // Get existing bookings for the date and location
      const existingBookings = await Courier.find({
        scheduledDeliveryDate: {
          $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
          $lt: new Date(selectedDate.setHours(23, 59, 59, 999))
        },
        'recipientAddress.city': location,
        status: { $nin: ['Cancelled', 'Delivered'] }
      });

      // Count bookings per slot
      const slotCounts = {};
      this.deliverySlots.forEach(slot => {
        slotCounts[slot.id] = 0;
      });

      existingBookings.forEach(booking => {
        if (booking.preferredTimeSlot && slotCounts.hasOwnProperty(booking.preferredTimeSlot)) {
          slotCounts[booking.preferredTimeSlot]++;
        }
      });

      // Return available slots (assuming max 10 deliveries per slot)
      const maxDeliveriesPerSlot = 10;
      return this.deliverySlots.map(slot => ({
        ...slot,
        availableSpots: Math.max(0, maxDeliveriesPerSlot - slotCounts[slot.id]),
        isAvailable: slotCounts[slot.id] < maxDeliveriesPerSlot
      }));
    } catch (error) {
      console.error('Get delivery slots error:', error);
      return this.deliverySlots.map(slot => ({ ...slot, availableSpots: 10, isAvailable: true }));
    }
  }

  // Modify existing booking
  async modifyBooking(userId, courierId, modifications) {
    try {
      const courier = await Courier.findOne({ _id: courierId, userId });
      if (!courier) {
        throw new Error('Booking not found or you do not have permission to modify it');
      }

      // Check if booking can be modified
      if (['Picked Up', 'In Transit', 'Delivered', 'Cancelled'].includes(courier.status)) {
        throw new Error('Cannot modify booking after pickup. Please contact customer support.');
      }

      const allowedModifications = [
        'recipientName', 'recipientPhone', 'recipientAddress',
        'scheduledDeliveryDate', 'preferredTimeSlot', 'specialInstructions',
        'priority', 'additionalServices'
      ];

      const updates = {};
      let costRecalculationNeeded = false;

      // Process allowed modifications
      Object.keys(modifications).forEach(key => {
        if (allowedModifications.includes(key)) {
          updates[key] = modifications[key];
          
          // Check if cost recalculation is needed
          if (['priority', 'additionalServices'].includes(key)) {
            costRecalculationNeeded = true;
          }
        }
      });

      // Recalculate cost if needed
      if (costRecalculationNeeded) {
        const bookingData = { ...courier.toObject(), ...updates };
        const costCalculation = await this.calculateBookingCost(bookingData);
        updates.estimatedCost = costCalculation.totalCost;
        updates.costBreakdown = costCalculation.breakdown;
      }

      updates.lastModified = new Date();
      updates.modificationHistory = courier.modificationHistory || [];
      updates.modificationHistory.push({
        modifiedAt: new Date(),
        modifications: Object.keys(modifications),
        modifiedBy: userId
      });

      const updatedCourier = await Courier.findByIdAndUpdate(
        courierId,
        { $set: updates },
        { new: true }
      );

      // Send modification confirmation
      const user = await User.findById(userId);
      if (user) {
        await this.sendBookingModificationConfirmation(user, updatedCourier, modifications);
      }

      return {
        success: true,
        message: 'Booking modified successfully',
        data: updatedCourier
      };
    } catch (error) {
      throw error;
    }
  }

  // Cancel booking with refund calculation
  async cancelBooking(userId, courierId, reason) {
    try {
      const courier = await Courier.findOne({ _id: courierId, userId });
      if (!courier) {
        throw new Error('Booking not found or you do not have permission to cancel it');
      }

      if (['Delivered', 'Cancelled'].includes(courier.status)) {
        throw new Error('Cannot cancel this booking');
      }

      // Calculate refund based on cancellation timing
      const refundInfo = this.calculateCancellationRefund(courier);

      const updates = {
        status: 'Cancelled',
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledBy: userId,
        refundInfo
      };

      const cancelledCourier = await Courier.findByIdAndUpdate(
        courierId,
        { $set: updates },
        { new: true }
      );

      // Send cancellation confirmation
      const user = await User.findById(userId);
      if (user) {
        await this.sendBookingCancellationConfirmation(user, cancelledCourier, refundInfo);
      }

      // Notify assigned agent if any
      if (courier.assignedAgent) {
        await notificationService.createNotification({
          recipientId: courier.assignedAgent,
          recipientType: 'deliveryAgent',
          title: 'Booking Cancelled',
          message: `Booking ${courier.trackingNumber} has been cancelled by the customer.`,
          type: 'booking_cancelled',
          data: { courierId: courier._id }
        });
      }

      return {
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          booking: cancelledCourier,
          refund: refundInfo
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Calculate cancellation refund
  calculateCancellationRefund(courier) {
    const timeDiff = new Date() - new Date(courier.createdAt);
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    let refundPercentage = 0;
    let processingFee = 50; // Base processing fee

    if (courier.status === 'Pending') {
      if (hoursDiff < 1) {
        refundPercentage = 100;
        processingFee = 0;
      } else if (hoursDiff < 24) {
        refundPercentage = 90;
      } else if (hoursDiff < 48) {
        refundPercentage = 75;
      } else {
        refundPercentage = 50;
      }
    } else if (courier.status === 'Confirmed') {
      refundPercentage = 25;
    } else {
      refundPercentage = 0; // No refund after pickup
    }

    const refundAmount = Math.max(0, (courier.estimatedCost * refundPercentage / 100) - processingFee);

    return {
      originalAmount: courier.estimatedCost,
      refundPercentage,
      processingFee,
      refundAmount: Math.round(refundAmount * 100) / 100,
      refundEligible: refundAmount > 0,
      processingTime: '3-5 business days'
    };
  }

  // Customer support chat initiation
  async initiateCustomerSupport(userId, courierId, subject, message, priority = 'medium') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let courier = null;
      if (courierId) {
        courier = await Courier.findOne({ _id: courierId, userId });
        if (!courier) {
          throw new Error('Booking not found');
        }
      }

      // Create support ticket
      const supportTicket = {
        userId,
        courierId,
        subject,
        priority,
        status: 'open',
        messages: [{
          sender: 'customer',
          message,
          timestamp: new Date()
        }],
        createdAt: new Date(),
        ticketNumber: await this.generateTicketNumber()
      };

      // In a real implementation, you would save this to a SupportTicket model
      // For now, we'll create a notification for admins
      await notificationService.createNotification({
        recipientType: 'admin',
        title: 'New Support Ticket',
        message: `Customer ${user.name} has created a new support ticket: ${subject}`,
        type: 'support_ticket',
        data: { 
          supportTicket,
          customerInfo: {
            name: user.name,
            email: user.email,
            phone: user.phone
          }
        }
      });

      return {
        success: true,
        message: 'Support ticket created successfully',
        data: {
          ticketNumber: supportTicket.ticketNumber,
          estimatedResponseTime: '2-4 hours'
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate ticket number
  async generateTicketNumber() {
    const prefix = 'SUP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Get customer delivery preferences
  async getCustomerPreferences(userId) {
    try {
      const user = await User.findById(userId).select('deliveryPreferences');
      
      const defaultPreferences = {
        preferredTimeSlots: ['flexible'],
        contactMethod: 'sms',
        specialInstructions: '',
  
        notificationPreferences: {
          sms: true,
          email: true,
          whatsapp: false
        },
        addressBook: []
      };

      return user?.deliveryPreferences || defaultPreferences;
    } catch (error) {
      throw error;
    }
  }

  // Update customer delivery preferences
  async updateCustomerPreferences(userId, preferences) {
    try {
      await User.findByIdAndUpdate(userId, {
        deliveryPreferences: preferences,
        lastPreferencesUpdate: new Date()
      });

      return {
        success: true,
        message: 'Delivery preferences updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Get customer address book
  async getCustomerAddressBook(userId) {
    try {
      const user = await User.findById(userId).select('deliveryPreferences.addressBook');
      return user?.deliveryPreferences?.addressBook || [];
    } catch (error) {
      throw error;
    }
  }

  // Add address to customer address book
  async addToAddressBook(userId, address) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.deliveryPreferences) {
        user.deliveryPreferences = { addressBook: [] };
      }

      if (!user.deliveryPreferences.addressBook) {
        user.deliveryPreferences.addressBook = [];
      }

      // Check if address already exists
      const existingAddress = user.deliveryPreferences.addressBook.find(
        addr => addr.label === address.label
      );

      if (existingAddress) {
        throw new Error('Address with this label already exists');
      }

      user.deliveryPreferences.addressBook.push({
        ...address,
        id: new mongoose.Types.ObjectId(),
        createdAt: new Date()
      });

      await user.save();

      return {
        success: true,
        message: 'Address added to address book'
      };
    } catch (error) {
      throw error;
    }
  }

  // Send multiple booking confirmation
  async sendMultipleBookingConfirmation(user, bookings, totalCost) {
    try {
      const emailData = {
        customerName: user.name,
        bookingCount: bookings.length,
        totalCost,
        bookings: bookings.map(booking => ({
          trackingNumber: booking.trackingNumber,
          recipientName: booking.recipientName,
          estimatedCost: booking.estimatedCost
        })),
        trackingURL: `${process.env.FRONTEND_URL}/track`
      };

      await emailService.sendEmail({
        to: user.email,
        subject: `Booking Confirmation - ${bookings.length} Packages Booked`,
        template: 'multiple-booking-confirmation',
        data: emailData
      });

      // Send SMS if phone number available
      if (user.phone) {
        const smsMessage = `Your ${bookings.length} packages have been booked successfully. Total cost: ₹${totalCost}. Track at ${process.env.FRONTEND_URL}/track`;
        await smsService.sendSMS(user.phone, smsMessage);
      }
    } catch (error) {
      console.error('Send multiple booking confirmation error:', error);
    }
  }

  // Send booking modification confirmation
  async sendBookingModificationConfirmation(user, booking, modifications) {
    try {
      const emailData = {
        customerName: user.name,
        trackingNumber: booking.trackingNumber,
        modifications: Object.keys(modifications),
        modifiedAt: new Date(),
        newCost: booking.estimatedCost
      };

      await emailService.sendEmail({
        to: user.email,
        subject: `Booking Modified - ${booking.trackingNumber}`,
        template: 'booking-modification',
        data: emailData
      });
    } catch (error) {
      console.error('Send booking modification confirmation error:', error);
    }
  }

  // Send booking cancellation confirmation
  async sendBookingCancellationConfirmation(user, booking, refundInfo) {
    try {
      const emailData = {
        customerName: user.name,
        trackingNumber: booking.trackingNumber,
        cancellationReason: booking.cancellationReason,
        refundInfo
      };

      await emailService.sendEmail({
        to: user.email,
        subject: `Booking Cancelled - ${booking.trackingNumber}`,
        template: 'booking-cancellation',
        data: emailData
      });
    } catch (error) {
      console.error('Send booking cancellation confirmation error:', error);
    }
  }



  // Get delivery priority options
  getPriorityOptions() {
    return Object.entries(this.priorityLevels).map(([level, info]) => ({
      level,
      multiplier: info.multiplier,
      description: info.description,
      additionalCost: `${((info.multiplier - 1) * 100).toFixed(0)}% extra`
    }));
  }

  // Get delivery time slots
  getDeliverySlots() {
    return this.deliverySlots;
  }
}

// Create singleton instance
const customerExperienceService = new CustomerExperienceService();

module.exports = customerExperienceService;