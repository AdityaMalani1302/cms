const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

// Import models
const Admin = require('../models/Admin');
const Branch = require('../models/Branch');
const Page = require('../models/Page');
const Courier = require('../models/Courier');
const CourierTracking = require('../models/CourierTracking');
const Contact = require('../models/Contact');
const Complaint = require('../models/Complaint');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cmsdb');
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    await Admin.deleteMany({});
    await Branch.deleteMany({});
    await Page.deleteMany({});
    await Courier.deleteMany({});
    await CourierTracking.deleteMany({});
    await Contact.deleteMany({});
    await Complaint.deleteMany({});

    console.log('Cleared existing data');

    // Seed Admin
    const admin = new Admin({
      adminName: 'Admin',
      adminUsername: 'admin',
      phone: '9878987987',
      adminEmail: 'cmsad12@gmai.com',
      adminPassword: 'Cms_admin@12' // Will be hashed automatically
    });
    await admin.save();
    console.log('Admin seeded');

    // Seed Branches
    const branches = [
      {
        branchCode: 'BR001',
        branchName: 'CMS Delhi',
        branchContactNumber: '8977977778',
        branchEmail: 'delhi@gmail.com',
        branchAddress: 'c-140, mayur vihar ph-3, near sbi bank',
        branchCity: 'New Delhi',
        branchState: 'Delhi',
        branchPincode: '2858978',
        branchCountry: 'India',
        branchManager: {
          name: 'Rajesh Kumar',
          contactNumber: '9876543210',
          email: 'rajesh.kumar@cmsdelhi.com'
        }
      },
      {
        branchCode: 'BR002',
        branchName: 'CMS Agra',
        branchContactNumber: '8797987777',
        branchEmail: 'agra@gmail.com',
        branchAddress: 'D-124, gohana road, near reliance fresh',
        branchCity: 'Agra',
        branchState: 'UP',
        branchPincode: '221001',
        branchCountry: 'India',
        branchManager: {
          name: 'Priya Sharma',
          contactNumber: '9876543211',
          email: 'priya.sharma@cmsagra.com'
        }
      },
      {
        branchCode: 'BR003',
        branchName: 'CMS Kanpur',
        branchContactNumber: '8988898889',
        branchEmail: 'kanpur@gmail.com',
        branchAddress: 'F-171, Maharana Pratap Road Near SBI Bank Block C',
        branchCity: 'Kanpur',
        branchState: 'UP',
        branchPincode: '2210014',
        branchCountry: 'India',
        branchManager: {
          name: 'Amit Singh',
          contactNumber: '9876543212',
          email: 'amit.singh@cmskanpur.com'
        }
      }
    ];

    await Branch.insertMany(branches);
    console.log('Branches seeded');

    // Seed Pages
    const pages = [
      {
        pageType: 'aboutus',
        pageTitle: 'About Us',
        pageDescription: 'CMS has been in business in the xyz area since 1985 and is locally managed and operated subsidiary of Need it Now Courier. With an on location Connecticut office plus a large company backup of resources, Expressway is able to offer a combination of very personal touch to high efficiency. With a reputation built on prompt and reliable service, we operate 24 hours a day 365 days a year',
        email: null,
        mobileNumber: null
      },
      {
        pageType: 'contactus',
        pageTitle: 'Contact Us',
        pageDescription: '#890 CFG Apartment, Mayur Vihar, Delhi-India',
        email: 'info@gmail.com',
        mobileNumber: '1234567890'
      }
    ];

    await Page.insertMany(pages);
    console.log('Pages seeded');

    // Seed sample courier data
    const courier = new Courier({
      refNumber: 'TRK116105512',
      senderBranch: 'CMS Kanpur',
      senderName: 'Rahul Mahajan',
      senderContactNumber: '8569745697',
      senderAddress: 'H.N0-B-3/4, Gulmar Colony',
      senderCity: 'Kanpur',
      senderState: 'UP',
      senderPincode: '221441',
      senderCountry: 'India',
      recipientName: 'Deepika Singh',
      recipientContactNumber: '987456123',
      recipientAddress: 'Flat No:104, harishnagar',
      recipientCity: 'Manaili',
      recipientState: 'HP',
      recipientPincode: '551224',
      recipientCountry: 'India',
      courierDescription: 'Parcel Contain fibre',
      parcelWeight: '3.5 kg',
      parcelDimensionLength: '45 inch',
      parcelDimensionWidth: '30 inch',
      parcelDimensionHeight: '25 inch',
      parcelPrice: 800.00,
      status: 'Delivered'
    });

    await courier.save();
    console.log('Sample courier seeded');

    // Add tracking history for the courier
    const trackingEntries = [
      {
        courierId: courier._id,
        remark: 'Parcel Has been picked',
        status: 'Shipped'
      },
      {
        courierId: courier._id,
        remark: 'Parcel reached hub city',
        status: 'Intransit'
      },
      {
        courierId: courier._id,
        remark: 'Arrived at destination',
        status: 'Arrived at Destination'
      },
      {
        courierId: courier._id,
        remark: 'Parcel out for delivery',
        status: 'Out for Delivery'
      },
      {
        courierId: courier._id,
        remark: 'Parcel has been delivered',
        status: 'Delivered'
      }
    ];

    await CourierTracking.insertMany(trackingEntries);
    console.log('Tracking history seeded');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

// Run the seeder
connectDB().then(() => {
  seedData();
}); 