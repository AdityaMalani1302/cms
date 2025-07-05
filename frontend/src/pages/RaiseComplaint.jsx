import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Card, Input, Button } from '../components/ui';

const RaiseComplaint = () => {
  const [formData, setFormData] = useState({
    trackingNumber: '',
    senderName: '',
    senderEmail: '',
    senderMobile: '',
    natureOfComplaint: '',
    issueDescription: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/complaints', formData);
      
      if (response.data.success) {
        toast.success(`Complaint submitted successfully! Your ticket number is: ${response.data.ticketNumber}`);
        setFormData({
          trackingNumber: '',
          senderName: '',
          senderEmail: '',
          senderMobile: '',
          natureOfComplaint: '',
          issueDescription: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const complaintCategories = [
    'Delayed Delivery',
    'Damaged Package',
    'Lost Package',
    'Wrong Delivery',
    'Poor Service',
    'Billing Issue',
    'Agent Behavior',
    'Other'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Hero Section */}
      <section className="relative gradient-bg overflow-hidden py-20">
        <div className="absolute inset-0 hero-pattern"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <i className="fas fa-exclamation-circle text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-display mb-4">
              Raise a Complaint
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              We value your feedback. Submit your complaint and we'll resolve it promptly
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Instructions Card */}
            <motion.div variants={itemVariants}>
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0">
                    <i className="fas fa-info-circle text-white"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">
                      Before You Submit
                    </h3>
                    <ul className="text-blue-700 dark:text-blue-400 space-y-1 text-sm">
                      <li>• Ensure you have your tracking number ready</li>
                      <li>• Provide accurate contact information for updates</li>
                      <li>• Describe your issue in detail for faster resolution</li>
                      <li>• You'll receive a ticket number for tracking your complaint</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Complaint Form */}
            <motion.div variants={itemVariants}>
              <Card className="p-8">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-danger-500 to-danger-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-edit text-white text-xl"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
                    Complaint Details
                  </h2>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    Fill in the information below to submit your complaint
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Tracking Number"
                      leftIcon="fas fa-barcode"
                      type="text"
                      name="trackingNumber"
                      value={formData.trackingNumber}
                      onChange={handleChange}
                      required
                      placeholder="Enter tracking number"
                      fullWidth
                    />
                    
                    <Input
                      label="Your Name"
                      leftIcon="fas fa-user"
                      type="text"
                      name="senderName"
                      value={formData.senderName}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                      fullWidth
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Email Address"
                      leftIcon="fas fa-envelope"
                      type="email"
                      name="senderEmail"
                      value={formData.senderEmail}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email"
                      fullWidth
                    />
                    
                    <Input
                      label="Mobile Number"
                      leftIcon="fas fa-phone"
                      type="tel"
                      name="senderMobile"
                      value={formData.senderMobile}
                      onChange={handleChange}
                      required
                      placeholder="Enter your mobile number"
                      fullWidth
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                      <i className="fas fa-list text-primary-500 mr-2"></i>
                      Nature of Complaint *
                    </label>
                    <select
                      name="natureOfComplaint"
                      value={formData.natureOfComplaint}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl focus:ring-4 focus:ring-primary-300 focus:border-primary-500 transition-all duration-300 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white"
                    >
                      <option value="">Select complaint type</option>
                      {complaintCategories.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                      <i className="fas fa-comment-alt text-primary-500 mr-2"></i>
                      Issue Description *
                    </label>
                    <textarea
                      name="issueDescription"
                      value={formData.issueDescription}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl focus:ring-4 focus:ring-primary-300 focus:border-primary-500 transition-all duration-300 resize-none bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500"
                      placeholder="Describe your issue in detail. Include any relevant information that might help us resolve your complaint faster..."
                    />
                  </div>
                  
                  <div className="flex justify-center pt-6">
                    <Button
                      type="submit"
                      loading={loading}
                      leftIcon="fas fa-paper-plane"
                      size="lg"
                      className="px-12"
                    >
                      {loading ? 'Submitting Complaint...' : 'Submit Complaint'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>

            {/* Success Info */}
            <motion.div variants={itemVariants}>
              <Card className="p-6 bg-gradient-to-br from-success-50 to-emerald-50 dark:from-success-900/20 dark:to-emerald-900/20 border border-success-200 dark:border-success-800">
                <div className="text-center">
                  <div className="w-12 h-12 bg-success-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-clock text-white"></i>
                  </div>
                  <h3 className="text-lg font-bold text-success-800 dark:text-success-300 mb-2">
                    What Happens Next?
                  </h3>
                  <p className="text-success-700 dark:text-success-400 mb-4">
                    Once you submit your complaint, our team will review it and respond within 24-48 hours.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      leftIcon="fas fa-ticket-alt"
                      onClick={() => window.location.href = '/track-complaint'}
                    >
                      Track Complaint
                    </Button>
                    <Button 
                      variant="ghost" 
                      leftIcon="fas fa-phone"
                      onClick={() => window.open('tel:+911234567890')}
                    >
                      Call Support
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default RaiseComplaint; 