const mongoose = require('mongoose');
const Courier = require('../models/Courier');
const User = require('../models/User');
// Notification service removed
const { calculateShippingCost } = require('../utils/pricingUtils');

class CustomerExperienceService {
  constructor() {
    this.deliverySlots = [
      { id: 'morning', label: 'Morning (9 AM - 12 PM)' },
      { id: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' },
      { id: 'evening', label: 'Evening (4 PM - 8 PM)' }
    ];
  }

  // Simplified single booking creation
  async createBooking(userId, bookingData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Basic validation
      const validation = this.validateBookingData(bookingData);
        if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
        }

      // Calculate basic cost
      const estimatedCost = this.calculateBaseCost(bookingData);
        
      // Create booking
      const booking = new Courier({
          ...bookingData,
          userId,
        refNumber: await this.generateTrackingNumber(),
        parcelPrice: estimatedCost,
        status: 'Courier Pickup',
        createdAt: new Date()
      });

      await booking.save();

      // Send notification
      // Notification service removed

      return {
        success: true,
        message: 'Booking created successfully',
        data: booking
      };
    } catch (error) {
      throw error;
    }
  }

  // Basic booking validation
  validateBookingData(bookingData) {
    const errors = [];

    // Required fields
    const required = ['senderName', 'senderAddress', 'recipientName', 'recipientAddress', 'parcelWeight'];
    required.forEach(field => {
      if (!bookingData[field]) {
        errors.push(`${field} is required`);
      }
    });

    // Basic weight validation
    if (bookingData.parcelWeight && (bookingData.parcelWeight <= 0 || bookingData.parcelWeight > 50)) {
      errors.push('Weight must be between 0.1 kg and 50 kg');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Cost calculation using centralized pricing
  calculateBaseCost(bookingData) {
    const weight = parseFloat(bookingData.parcelWeight) || 1;
    const serviceType = bookingData.serviceType || 'Standard';
    try {
      return calculateShippingCost(weight, serviceType);
    } catch (error) {
      // Fallback for invalid data
      return calculateShippingCost(weight, 'Standard');
    }
  }

  // Generate simple tracking number
  async generateTrackingNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TRK${timestamp}${random}`;
  }

  // Simplified booking modification
  async modifyBooking(userId, courierId, modifications) {
    try {
      const courier = await Courier.findOne({ _id: courierId, userId });
      if (!courier) {
        throw new Error('Booking not found');
      }

      if (courier.status !== 'Courier Pickup') {
        throw new Error('Cannot modify booking after pickup');
      }

      // Update allowed fields only
      const allowedFields = ['recipientAddress', 'recipientContactNumber', 'courierDescription'];
      allowedFields.forEach(field => {
        if (modifications[field]) {
          courier[field] = modifications[field];
        }
      });

      await courier.save();

      return {
        success: true,
        message: 'Booking modified successfully',
        data: courier
      };
    } catch (error) {
      throw error;
    }
  }

  // Basic booking cancellation
  async cancelBooking(userId, courierId, reason) {
    try {
      const courier = await Courier.findOne({ _id: courierId, userId });
      if (!courier) {
        throw new Error('Booking not found');
      }

      if (!['Courier Pickup', 'Shipped'].includes(courier.status)) {
        throw new Error('Cannot cancel booking at this stage');
      }

      courier.status = 'Cancelled';
      courier.cancellationReason = reason;
      courier.cancelledAt = new Date();

      await courier.save();

      return {
        success: true,
        message: 'Booking cancelled successfully',
        data: courier
      };
    } catch (error) {
      throw error;
    }
  }

  // Get delivery slots
  getDeliverySlots() {
    return this.deliverySlots;
  }
}

module.exports = new CustomerExperienceService();