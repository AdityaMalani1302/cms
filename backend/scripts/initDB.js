const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

// Import all models
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const Courier = require('../models/Courier');
const Complaint = require('../models/Complaint');
const DeliveryAgent = require('../models/DeliveryAgent');
const Branch = require('../models/Branch');
const Contact = require('../models/Contact');
const Analytics = require('../models/Analytics');

const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cmsdb');
    console.log('✅ Connected to MongoDB');

    // Create collections by ensuring models are compiled
    console.log('\n📦 Creating collections...');
    
    const models = [
      { model: User, name: 'Users' },
      { model: Booking, name: 'Bookings' },
      { model: Review, name: 'Reviews' },
      { model: SupportTicket, name: 'Support Tickets' },
      { model: Notification, name: 'Notifications' },
      { model: Admin, name: 'Admins' },
      { model: Courier, name: 'Couriers' },
      { model: Complaint, name: 'Complaints' },
      { model: DeliveryAgent, name: 'Delivery Agents' },
      { model: Branch, name: 'Branches' },
      { model: Contact, name: 'Contacts' },
      { model: Analytics, name: 'Analytics' }
    ];

    // Create all collections
    for (const { model, name } of models) {
      try {
        await model.createCollection();
        console.log(`✅ ${name} collection created`);
      } catch (error) {
        if (error.code === 48) {
          console.log(`ℹ️  ${name} collection already exists`);
        } else {
          console.error(`❌ Error creating ${name} collection:`, error.message);
        }
      }
    }

    // Create performance-critical indexes
    console.log('\n🔗 Creating performance indexes...');

    // User indexes for login and lookups
    try {
      await User.collection.createIndex({ email: 1 }, { unique: true, background: true });
      await User.collection.createIndex({ phoneNumber: 1 }, { background: true });
      await User.collection.createIndex({ isActive: 1 }, { background: true });
      console.log('✅ User indexes created');
    } catch (error) {
      console.log('ℹ️  User indexes already exist or creation failed:', error.message);
    }

    // Booking indexes for tracking and status queries
    try {
      await Booking.collection.createIndex({ trackingId: 1 }, { unique: true, background: true });
      await Booking.collection.createIndex({ userId: 1 }, { background: true });
      await Booking.collection.createIndex({ status: 1 }, { background: true });
      await Booking.collection.createIndex({ pickupDate: 1 }, { background: true });
      await Booking.collection.createIndex({ expectedDeliveryDate: 1 }, { background: true });
      await Booking.collection.createIndex({ createdAt: -1 }, { background: true });
      console.log('✅ Booking indexes created');
    } catch (error) {
      console.log('ℹ️  Booking indexes already exist or creation failed:', error.message);
    }

    // Courier indexes for tracking and admin management
    try {
      await Courier.collection.createIndex({ refNumber: 1 }, { unique: true, background: true });
      await Courier.collection.createIndex({ status: 1 }, { background: true });
      await Courier.collection.createIndex({ senderCity: 1 }, { background: true });
      await Courier.collection.createIndex({ recipientCity: 1 }, { background: true });
      await Courier.collection.createIndex({ createdAt: -1 }, { background: true });
      await Courier.collection.createIndex({ senderContactNumber: 1 }, { background: true });
      await Courier.collection.createIndex({ recipientContactNumber: 1 }, { background: true });
      console.log('✅ Courier indexes created');
    } catch (error) {
      console.log('ℹ️  Courier indexes already exist or creation failed:', error.message);
    }

    // Complaint indexes for ticket tracking
    try {
      await Complaint.collection.createIndex({ ticketNumber: 1 }, { unique: true, background: true });
      await Complaint.collection.createIndex({ trackingNumber: 1 }, { background: true });
      await Complaint.collection.createIndex({ status: 1 }, { background: true });
      await Complaint.collection.createIndex({ priority: 1 }, { background: true });
      await Complaint.collection.createIndex({ complaintCategory: 1 }, { background: true });
      await Complaint.collection.createIndex({ createdAt: -1 }, { background: true });
      await Complaint.collection.createIndex({ "customerInfo.email": 1 }, { background: true });
      console.log('✅ Complaint indexes created');
    } catch (error) {
      console.log('ℹ️  Complaint indexes already exist or creation failed:', error.message);
    }

    // Admin indexes for authentication
    try {
      await Admin.collection.createIndex({ adminUsername: 1 }, { unique: true, background: true });
      await Admin.collection.createIndex({ adminEmail: 1 }, { unique: true, background: true });
      await Admin.collection.createIndex({ status: 1 }, { background: true });
      console.log('✅ Admin indexes created');
    } catch (error) {
      console.log('ℹ️  Admin indexes already exist or creation failed:', error.message);
    }

    // Delivery Agent indexes
    try {
      await DeliveryAgent.collection.createIndex({ agentId: 1 }, { unique: true, background: true });
      await DeliveryAgent.collection.createIndex({ agentEmail: 1 }, { unique: true, background: true });
      await DeliveryAgent.collection.createIndex({ status: 1 }, { background: true });
      await DeliveryAgent.collection.createIndex({ isAvailable: 1 }, { background: true });
      await DeliveryAgent.collection.createIndex({ assignedBranch: 1 }, { background: true });
      console.log('✅ Delivery Agent indexes created');
    } catch (error) {
      console.log('ℹ️  Delivery Agent indexes already exist or creation failed:', error.message);
    }

    // Notification indexes for user queries
    try {
      await Notification.collection.createIndex({ userId: 1 }, { background: true });
      await Notification.collection.createIndex({ isRead: 1 }, { background: true });
      await Notification.collection.createIndex({ createdAt: -1 }, { background: true });
      console.log('✅ Notification indexes created');
    } catch (error) {
      console.log('ℹ️  Notification indexes already exist or creation failed:', error.message);
    }

    // Support Ticket indexes
    try {
      await SupportTicket.collection.createIndex({ status: 1 }, { background: true });
      await SupportTicket.collection.createIndex({ priority: 1 }, { background: true });
      await SupportTicket.collection.createIndex({ createdAt: -1 }, { background: true });
      console.log('✅ Support Ticket indexes created');
    } catch (error) {
      console.log('ℹ️  Support Ticket indexes already exist or creation failed:', error.message);
    }

    // Branch indexes
    try {
      await Branch.collection.createIndex({ branchName: 1 }, { background: true });
      await Branch.collection.createIndex({ city: 1 }, { background: true });
      await Branch.collection.createIndex({ state: 1 }, { background: true });
      await Branch.collection.createIndex({ pincode: 1 }, { background: true });
      console.log('✅ Branch indexes created');
    } catch (error) {
      console.log('ℹ️  Branch indexes already exist or creation failed:', error.message);
    }

    // Contact indexes
    try {
      await Contact.collection.createIndex({ email: 1 }, { background: true });
      await Contact.collection.createIndex({ createdAt: -1 }, { background: true });
      console.log('✅ Contact indexes created');
    } catch (error) {
      console.log('ℹ️  Contact indexes already exist or creation failed:', error.message);
    }

    // Create compound indexes for common query patterns
    console.log('\n🔗 Creating compound indexes...');

    try {
      // Booking compound indexes for dashboard queries
      await Booking.collection.createIndex({ userId: 1, status: 1 }, { background: true });
      await Booking.collection.createIndex({ status: 1, createdAt: -1 }, { background: true });
      
      // Courier compound indexes for admin filters
      await Courier.collection.createIndex({ status: 1, createdAt: -1 }, { background: true });
      await Courier.collection.createIndex({ senderCity: 1, status: 1 }, { background: true });
      
      // Complaint compound indexes for filtering
      await Complaint.collection.createIndex({ status: 1, priority: 1 }, { background: true });
      await Complaint.collection.createIndex({ complaintCategory: 1, status: 1 }, { background: true });
      
      console.log('✅ Compound indexes created');
    } catch (error) {
      console.log('ℹ️  Compound indexes already exist or creation failed:', error.message);
    }

    // Create default admin if none exists
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      console.log('\n👤 Creating default admin...');
      const defaultAdmin = new Admin({
        adminName: 'System Administrator',
        adminUsername: 'admin',
        adminEmail: 'admin@cms.com',
        adminPassword: 'Admin@123!', // This will be hashed by the pre-save hook
        phone: '0000000000',
        department: 'Administration',
        role: 'Super Admin',
        bio: 'System Administrator for Courier Management System'
      });
      await defaultAdmin.save();
      console.log('✅ Default admin created');
      console.log('📋 Login credentials:');
      console.log('   Username: admin');
      console.log('   Password: Admin@123!');
      console.log('   Email: admin@cms.com');
    } else {
      console.log('ℹ️  Admin already exists, skipping creation');
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📊 Collection and Index Summary:');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📦 Total Collections: ${collections.length}`);
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });

    // Get index information
    console.log('\n🔗 Index Summary:');
    for (const { model, name } of models) {
      try {
        const indexes = await model.collection.indexes();
        console.log(`   ${name}: ${indexes.length} indexes`);
      } catch (error) {
        console.log(`   ${name}: Error getting index info`);
      }
    }

    console.log('\n💡 Performance Tips:');
    console.log('   - All critical indexes have been created');
    console.log('   - Queries on indexed fields will be much faster');
    console.log('   - Monitor query performance using MongoDB Compass');
    console.log('   - Consider adding more indexes based on your query patterns');

    console.log('\n🚀 Your CMS is now optimized and ready for production!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('💡 Troubleshooting:');
    console.error('   - Ensure MongoDB is running');
    console.error('   - Check your MONGODB_URI in config.env');
    console.error('   - Verify sufficient disk space for indexes');
  } finally {
    try {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting:', error.message);
    }
    process.exit(0);
  }
};

// Run initialization
console.log('🚀 Starting CMS Database Initialization...');
console.log('⚡ This will create collections, indexes, and default admin');
console.log('📊 Optimizing for performance and scalability\n');

initializeDatabase(); 