const mongoose = require('mongoose');

/**
 * Execute multiple database operations within a transaction
 * @param {Function} operations - Async function containing operations to execute
 * @param {Object} options - Transaction options
 * @returns {Promise} - Transaction result
 */
const executeInTransaction = async (operations, options = {}) => {
  const session = await mongoose.startSession();
  
  try {
    return await session.withTransaction(async () => {
      return await operations(session);
    }, {
      readPreference: 'primary',
      readConcern: { level: 'local' },
      writeConcern: { w: 'majority' },
      ...options
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Create a booking with transaction (ensures data consistency)
 * @param {Object} bookingData - Booking information
 * @param {Object} userData - User information if creating new user
 * @returns {Promise} - Transaction result
 */
const createBookingTransaction = async (bookingData, userData = null) => {
  return executeInTransaction(async (session) => {
    const User = require('../models/User');
    const Booking = require('../models/Booking');
    const Analytics = require('../models/Analytics');
    
    let user = null;
    
    // If creating new user, do it within transaction
    if (userData) {
      const existingUser = await User.findOne({ email: userData.email }).session(session);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }
      user = await User.create([userData], { session });
      user = user[0];
    } else {
      user = await User.findById(bookingData.userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }
    }
    
    // Create booking
    const booking = await Booking.create([{
      ...bookingData,
      userId: user._id
    }], { session });
    
    // Update analytics atomically
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await Analytics.findOneAndUpdate(
      { date: today },
      { 
        $inc: { 
          totalBookings: 1,
          revenue: bookingData.totalAmount || 0
        }
      },
      { 
        upsert: true, 
        session,
        new: true 
      }
    );
    
    return {
      user,
      booking: booking[0]
    };
  });
};

/**
 * Update delivery status with transaction
 * @param {string} bookingId - Booking ID
 * @param {string} status - New status
 * @param {string} agentId - Delivery agent ID
 * @param {Object} updateData - Additional update data
 * @returns {Promise} - Transaction result
 */
const updateDeliveryStatusTransaction = async (bookingId, status, agentId, updateData = {}) => {
  return executeInTransaction(async (session) => {
    const Booking = require('../models/Booking');
    const DeliveryAgent = require('../models/DeliveryAgent');
    const Analytics = require('../models/Analytics');
    const CourierTracking = require('../models/CourierTracking');
    
    // Find and update booking
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { 
        status,
        deliveryAgentId: agentId,
        ...updateData,
        updatedAt: new Date()
      },
      { 
        new: true, 
        session 
      }
    );
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Update delivery agent statistics
    const agent = await DeliveryAgent.findById(agentId).session(session);
    if (!agent) {
      throw new Error('Delivery agent not found');
    }
    
    const updateFields = {};
    if (status === 'delivered') {
      updateFields.successfulDeliveries = (agent.successfulDeliveries || 0) + 1;
      updateFields.isAvailable = true;
    } else if (status === 'failed' || status === 'returned') {
      updateFields.failedDeliveries = (agent.failedDeliveries || 0) + 1;
      updateFields.isAvailable = true;
    }
    
    if (Object.keys(updateFields).length > 0) {
      updateFields.totalDeliveries = (agent.totalDeliveries || 0) + 1;
      await DeliveryAgent.findByIdAndUpdate(
        agentId,
        { $set: updateFields },
        { session }
      );
    }
    
    // Create tracking entry
    await CourierTracking.create([{
      trackingId: booking.trackingId,
      status,
      location: updateData.location || 'Distribution Center',
      timestamp: new Date(),
      description: `Package ${status} by delivery agent`,
      deliveryAgentId: agentId
    }], { session });
    
    // Update daily analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const analyticsUpdate = {};
    if (status === 'delivered') {
      analyticsUpdate.successfulDeliveries = 1;
    } else if (status === 'failed' || status === 'returned') {
      analyticsUpdate.failedDeliveries = 1;
    }
    
    if (Object.keys(analyticsUpdate).length > 0) {
      await Analytics.findOneAndUpdate(
        { date: today },
        { $inc: analyticsUpdate },
        { 
          upsert: true, 
          session,
          new: true 
        }
      );
    }
    
    return {
      booking,
      agent
    };
  });
};

/**
 * Process complaint with transaction
 * @param {Object} complaintData - Complaint information
 * @returns {Promise} - Transaction result
 */
const processComplaintTransaction = async (complaintData) => {
  return executeInTransaction(async (session) => {
    const Complaint = require('../models/Complaint');
    const Booking = require('../models/Booking');
    const Analytics = require('../models/Analytics');
    const Notification = require('../models/Notification');
    
    // Create complaint
    const complaint = await Complaint.create([complaintData], { session });
    
    // Update related booking if exists
    if (complaintData.bookingId) {
      await Booking.findByIdAndUpdate(
        complaintData.bookingId,
        { 
          hasComplaint: true,
          complaintId: complaint[0]._id
        },
        { session }
      );
    }
    
    // Update analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await Analytics.findOneAndUpdate(
      { date: today },
      { $inc: { totalComplaints: 1 } },
      { 
        upsert: true, 
        session,
        new: true 
      }
    );
    
    // Create notification for admin
    await Notification.create([{
      recipientType: 'admin',
      title: 'New Complaint Received',
      message: `Complaint #${complaint[0].complaintId} has been submitted`,
      type: 'complaint',
      data: {
        complaintId: complaint[0]._id,
        complaintNumber: complaint[0].complaintId
      }
    }], { session });
    
    return complaint[0];
  });
};

/**
 * Delete user account with all related data (GDPR compliance)
 * @param {string} userId - User ID to delete
 * @returns {Promise} - Transaction result
 */
const deleteUserAccountTransaction = async (userId) => {
  return executeInTransaction(async (session) => {
    const User = require('../models/User');
    const Booking = require('../models/Booking');
    const Complaint = require('../models/Complaint');
    const Review = require('../models/Review');
    const Notification = require('../models/Notification');
    
    // Check if user exists
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check for active bookings
    const activeBookings = await Booking.countDocuments({
      userId,
      status: { $in: ['pending', 'in-transit', 'out-for-delivery'] }
    }).session(session);
    
    if (activeBookings > 0) {
      throw new Error('Cannot delete account with active bookings');
    }
    
    // Delete related data
    await Promise.all([
      Booking.deleteMany({ userId }, { session }),
      Complaint.deleteMany({ userId }, { session }),
      Review.deleteMany({ userId }, { session }),
      Notification.deleteMany({ userId }, { session })
    ]);
    
    // Delete user account
    await User.findByIdAndDelete(userId, { session });
    
    return {
      deletedUser: user.email,
      deletedAt: new Date()
    };
  });
};

/**
 * Retry wrapper for transaction operations
 * @param {Function} transactionFn - Transaction function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay between retries (ms)
 * @returns {Promise} - Transaction result
 */
const retryTransaction = async (transactionFn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transactionFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry for validation errors or business logic errors
      if (error.name === 'ValidationError' || 
          error.message.includes('not found') ||
          error.message.includes('already exists')) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Transaction attempt ${attempt} failed, retrying in ${delay}ms...`);
    }
  }
  
  throw lastError;
};

module.exports = {
  executeInTransaction,
  createBookingTransaction,
  updateDeliveryStatusTransaction,
  processComplaintTransaction,
  deleteUserAccountTransaction,
  retryTransaction
}; 