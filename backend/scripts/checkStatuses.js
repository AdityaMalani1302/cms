const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const Booking = require('../models/Booking');
const Courier = require('../models/Courier');

const checkStatuses = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check Booking statuses
    console.log('\n📋 BOOKING STATUSES:');
    const bookings = await Booking.find({}).select('trackingId status').limit(10);
    bookings.forEach(booking => {
      console.log(`  ${booking.trackingId || booking._id}: "${booking.status}" (${typeof booking.status})`);
    });

    // Check Courier statuses  
    console.log('\n🚚 COURIER STATUSES:');
    const couriers = await Courier.find({}).select('refNumber status').limit(10);
    couriers.forEach(courier => {
      console.log(`  ${courier.refNumber || courier._id}: "${courier.status}" (${typeof courier.status})`);
    });

    // Get unique statuses
    console.log('\n🔍 UNIQUE BOOKING STATUSES:');
    const uniqueBookingStatuses = await Booking.distinct('status');
    uniqueBookingStatuses.forEach(status => {
      console.log(`  "${status}" (${typeof status}, length: ${status?.length})`);
    });

    console.log('\n🔍 UNIQUE COURIER STATUSES:');
    const uniqueCourierStatuses = await Courier.distinct('status');
    uniqueCourierStatuses.forEach(status => {
      console.log(`  "${status}" (${typeof status}, length: ${status?.length})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

checkStatuses();