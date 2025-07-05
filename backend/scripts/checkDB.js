const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

const checkDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cmsdb');
    console.log('✅ Connected to MongoDB');

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Database Collections:');
    
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} documents`);
    }

    // Test User model specifically
    const User = require('../models/User');
    console.log('\n👤 Testing User model...');
    console.log('User collection exists:', await User.collection.collectionName);

  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

checkDatabase(); 