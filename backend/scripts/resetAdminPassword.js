#!/usr/bin/env node

/**
 * Admin Password Reset Script
 * 
 * Usage: node scripts/resetAdminPassword.js <username> <newPassword>
 * Example: node scripts/resetAdminPassword.js admin newpassword123
 * 
 * This script directly resets the admin password in the database.
 * Perfect for academic/development environments.
 * 
 * Security: This bypasses all authentication and should only be used
 * in development or emergency situations.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../config.env' });

// Import Admin model
const Admin = require('../models/Admin');

async function resetAdminPassword() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length !== 2) {
      console.log('\n❌ Usage: node resetAdminPassword.js <username> <newPassword>');
      console.log('📝 Example: node resetAdminPassword.js admin newpassword123\n');
      process.exit(1);
    }
    
    const [username, newPassword] = args;
    
    if (newPassword.length < 8) {
      console.log('\n❌ Password must be at least 8 characters long\n');
      process.exit(1);
    }
    
    // Connect to MongoDB
    console.log('🔌 Connecting to database...');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmsdb';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to database');
    
    // Find admin user
    console.log(`🔍 Looking for admin user: ${username}`);
    const admin = await Admin.findOne({ adminUsername: username });
    
    if (!admin) {
      console.log(`\n❌ Admin user '${username}' not found!`);
      console.log('💡 Available admin users:');
      
      const allAdmins = await Admin.find().select('adminUsername adminEmail');
      if (allAdmins.length === 0) {
        console.log('   No admin users found in database');
      } else {
        allAdmins.forEach(a => {
          console.log(`   - ${a.adminUsername} (${a.adminEmail})`);
        });
      }
      console.log('');
      process.exit(1);
    }
    
    console.log('✅ Admin user found');
    
    // Hash the new password
    console.log('🔐 Hashing new password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update admin password
    console.log('💾 Updating password in database...');
    admin.adminPassword = hashedPassword;
    admin.lastPasswordReset = new Date();
    admin.passwordResetAttempts = 0;
    
    await admin.save();
    
    console.log('\n🎉 SUCCESS! Admin password has been reset');
    console.log(`👤 Username: ${admin.adminUsername}`);
    console.log(`📧 Email: ${admin.adminEmail}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`⏰ Reset Time: ${admin.lastPasswordReset.toLocaleString()}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Login to admin panel with new credentials');
    console.log('2. Change password to something more secure');
    console.log('3. Update any documentation with new credentials');
    
    console.log('\n⚠️  Security Notes:');
    console.log('- This password is now stored in your terminal history');
    console.log('- Change it immediately after logging in');
    console.log('- Keep master recovery key secure for future use\n');
    
  } catch (error) {
    console.error('\n❌ Error resetting admin password:', error.message);
    
    if (error.name === 'ValidationError') {
      console.log('\n📝 Validation Error Details:');
      Object.values(error.errors).forEach(err => {
        console.log(`   - ${err.message}`);
      });
    }
    
    console.log('');
    process.exit(1);
  } finally {
    // Always close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Database connection closed');
    }
  }
}

// Handle script interruption
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Script interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
  process.exit(0);
});

// Run the script
console.log('🚀 Admin Password Reset Script');
console.log('============================\n');

resetAdminPassword();