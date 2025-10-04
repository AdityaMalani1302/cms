const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });
const Admin = require('../models/Admin');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cmsdb');
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [
        { adminUsername: 'admin' },
        { adminEmail: 'cmsad12@gmail.com' }
      ]
    });

    if (existingAdmin) {
      console.log('ℹ️  Admin already exists:', {
        username: existingAdmin.adminUsername,
        email: existingAdmin.adminEmail
      });
      console.log('📋 Use these credentials:');
      console.log('   Username: ' + existingAdmin.adminUsername);
      console.log('   Email: ' + existingAdmin.adminEmail);
      console.log('   Password: Cms_admin@12 (if not changed)');
    } else {
      console.log('👤 Creating new admin...');
      const newAdmin = new Admin({
        adminName: 'System Administrator',
        adminUsername: 'admin',
        adminEmail: 'cmsad12@gmail.com',
        adminPassword: 'Cms_admin@12', // This will be hashed by the pre-save hook
        phone: '0000000000',
        department: 'Administration',
        role: 'Super Admin',
        bio: 'System Administrator for Courier Management System'
      });

      await newAdmin.save();
      console.log('✅ Admin created successfully!');
      console.log('📋 Login credentials:');
      console.log('   Username: admin');
      console.log('   Email: cmsad12@gmail.com');
      console.log('   Password: Cms_admin@12');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('💡 Make sure MongoDB is running and accessible');
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

// Run the script
createAdmin();