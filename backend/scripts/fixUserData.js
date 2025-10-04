const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

const User = require('../models/User');
const Courier = require('../models/Courier');
const Complaint = require('../models/Complaint');
const Booking = require('../models/Booking');

const fixUserData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cmsdb');
    console.log('✅ Connected to MongoDB');

    // 1. Check current data state
    console.log('\n📊 Current Data Analysis:');
    
    const totalUsers = await User.countDocuments();
    const totalCouriers = await Courier.countDocuments();
    const totalComplaints = await Complaint.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Couriers: ${totalCouriers}`);
    console.log(`Total Complaints: ${totalComplaints}`);
    console.log(`Total Bookings: ${totalBookings}`);

    // 2. Check couriers with userId
    const couriersWithUserId = await Courier.countDocuments({ userId: { $exists: true, $ne: null } });
    const couriersWithoutUserId = await Courier.countDocuments({ $or: [{ userId: { $exists: false } }, { userId: null }] });
    
    console.log(`\n📦 Courier Analysis:`);
    console.log(`Couriers with userId: ${couriersWithUserId}`);
    console.log(`Couriers without userId: ${couriersWithoutUserId}`);

    // 3. Check complaints structure
    const complaintsWithEmail = await Complaint.countDocuments({ 'customerInfo.email': { $exists: true } });
    console.log(`\n📝 Complaint Analysis:`);
    console.log(`Complaints with customerInfo.email: ${complaintsWithEmail}`);

    // 4. Try to link existing couriers to users based on email/phone
    if (couriersWithoutUserId > 0) {
      console.log(`\n🔗 Attempting to link ${couriersWithoutUserId} couriers to users...`);
      
      const unlinkedCouriers = await Courier.find({ 
        $or: [{ userId: { $exists: false } }, { userId: null }] 
      });
      
      let linkedCount = 0;
      for (const courier of unlinkedCouriers) {
        // Try to find user by phone number first, then by name
        let user = await User.findOne({ phoneNumber: courier.senderContactNumber });
        if (!user) {
          user = await User.findOne({ name: { $regex: courier.senderName, $options: 'i' } });
        }
        
        if (user) {
          await Courier.findByIdAndUpdate(courier._id, { userId: user._id });
          linkedCount++;
          console.log(`✅ Linked courier ${courier.refNumber} to user ${user.name}`);
        } else {
          console.log(`❌ Could not find user for courier ${courier.refNumber} (sender: ${courier.senderName})`);
        }
      }
      console.log(`📊 Successfully linked ${linkedCount} out of ${couriersWithoutUserId} couriers`);
    }

    // 5. Show sample data for debugging
    console.log(`\n🔍 Sample Data for Debugging:`);
    
    const sampleUsers = await User.find().limit(2).select('name email phoneNumber');
    console.log('Sample Users:', JSON.stringify(sampleUsers, null, 2));
    
    const sampleCouriers = await Courier.find().limit(2).select('refNumber senderName senderContactNumber userId');
    console.log('Sample Couriers:', JSON.stringify(sampleCouriers, null, 2));
    
    const sampleComplaints = await Complaint.find().limit(2).select('ticketNumber customerInfo');
    console.log('Sample Complaints:', JSON.stringify(sampleComplaints, null, 2));

    // 6. Test the API logic
    if (sampleUsers.length > 0) {
      const testUser = sampleUsers[0];
      console.log(`\n🧪 Testing API logic for user: ${testUser.name}`);
      
      const courierCount = await Courier.countDocuments({ userId: testUser._id });
      const complaintCount = await Complaint.countDocuments({ 'customerInfo.email': testUser.email });
      
      console.log(`User ${testUser.name}:`);
      console.log(`  - Email: ${testUser.email}`);
      console.log(`  - Courier Count: ${courierCount}`);
      console.log(`  - Complaint Count: ${complaintCount}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
fixUserData();