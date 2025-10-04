import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { showToast } from '../../utils/toastUtils';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { validators } from '../../utils/validators';
import { useNavigate } from 'react-router-dom';

const RaiseComplaint = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/customer/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    trackingNumber: '',
    complaintCategory: '',
    natureOfComplaint: '',
    priority: 'Medium'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

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

  const priorityLevels = [
    { value: 'Low', label: 'Low', color: 'text-green-600' },
    { value: 'Medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'High', label: 'High', color: 'text-orange-600' },
    { value: 'Critical', label: 'Critical', color: 'text-red-600' }
  ];

  // Validation function for individual fields
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'trackingNumber':
        return validators.trackingNumber.validate(value);
      case 'complaintCategory':
        return validators.select.validate(value, 'complaint category');
      case 'natureOfComplaint':
        return validators.briefDescription.validate(value);
      case 'priority':
        return validators.select.validate(value, 'priority level');
      default:
        return null;
    }
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {};
    
    newErrors.trackingNumber = validateField('trackingNumber', formData.trackingNumber);
    newErrors.complaintCategory = validateField('complaintCategory', formData.complaintCategory);
    newErrors.natureOfComplaint = validateField('natureOfComplaint', formData.natureOfComplaint);
    newErrors.priority = validateField('priority', formData.priority);
    
    // Remove null errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change with validation
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate field if it has been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  // Handle field blur for validation
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    const error = validateField(name, formData[name]);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast.error('Please fix the validation errors');
      return;
    }

    setLoading(true);

    try {
      const complaintData = {
        trackingNumber: formData.trackingNumber.trim(),
        customerInfo: {
          name: user?.name || '',
          email: user?.email || '',
          contactNumber: user?.phoneNumber || ''
        },
        complaintCategory: formData.complaintCategory,
        priority: formData.priority,
        natureOfComplaint: formData.natureOfComplaint.trim()
      };

      console.log('📋 Submitting complaint:', complaintData);

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/complaints`, complaintData);
      
      if (response.data.success) {
        showToast.success(`Complaint submitted successfully! Your ticket number is: ${response.data.data.ticketNumber}`);
        setFormData({
          trackingNumber: '',
          complaintCategory: '',
          natureOfComplaint: '',
          priority: 'Medium'
        });
        setErrors({});
      }
    } catch (error) {
      console.error('❌ Complaint submission error:', error);
      if (error.response?.status === 404) {
        showToast.error('Invalid tracking number. Please check and try again.');
      } else if (error.response?.status === 400) {
        showToast.error(error.response?.data?.message || 'Please check your input and try again.');
      } else {
        showToast.error(error.response?.data?.message || 'Error submitting complaint. Please try again.');
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm transform transition-transform hover:scale-105 hover:rotate-3">
              <i className="fas fa-exclamation-circle text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-display mb-4">
              Raise a Complaint
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              We're here to help resolve any issues with your shipment. Let us know what went wrong.
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
            {/* Form */}
            <motion.div variants={itemVariants}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 transform transition-transform hover:scale-105 hover:rotate-3">
                    <i className="fas fa-clipboard-list text-white text-2xl"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Submit Your Complaint
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Please provide as much detail as possible to help us resolve your issue quickly
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Tracking Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <i className="fas fa-hashtag text-blue-500 mr-2"></i>
                      Tracking Number *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="trackingNumber"
                        placeholder="Enter your tracking/reference number"
                        value={formData.trackingNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                      {touched.trackingNumber && errors.trackingNumber && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1 flex items-center"
                        >
                          <i className="fas fa-exclamation-circle mr-1"></i>
                          {errors.trackingNumber}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  {/* Complaint Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <i className="fas fa-folder text-blue-500 mr-2"></i>
                      Complaint Category *
                    </label>
                    <select
                      name="complaintCategory"
                      value={formData.complaintCategory}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    >
                      <option value="">Select a category</option>
                      {complaintCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {touched.complaintCategory && errors.complaintCategory && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm mt-1 flex items-center"
                      >
                        <i className="fas fa-exclamation-circle mr-1"></i>
                        {errors.complaintCategory}
                      </motion.p>
                    )}
                  </div>

                  {/* Priority Level */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <i className="fas fa-flag text-blue-500 mr-2"></i>
                      Priority Level *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {priorityLevels.map(({ value, label, color }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleChange({ target: { name: 'priority', value } })}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            formData.priority === value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nature of Complaint */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <i className="fas fa-comment-alt text-blue-500 mr-2"></i>
                      Nature of Complaint *
                    </label>
                    <textarea
                      name="natureOfComplaint"
                      placeholder="Please describe your issue in detail..."
                      value={formData.natureOfComplaint}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      rows={4}
                      className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors resize-none"
                    />
                    {touched.natureOfComplaint && errors.natureOfComplaint && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm mt-1 flex items-center"
                      >
                        <i className="fas fa-exclamation-circle mr-1"></i>
                        {errors.natureOfComplaint}
                      </motion.p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-center pt-4">
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane mr-2"></i>
                          Submit Complaint
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default RaiseComplaint; 