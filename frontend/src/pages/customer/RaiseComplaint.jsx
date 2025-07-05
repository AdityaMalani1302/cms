import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
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
    issueDescription: '',
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
      case 'issueDescription':
        return validators.detailedDescription.validate(value);
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
    newErrors.issueDescription = validateField('issueDescription', formData.issueDescription);
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
      toast.error('Please fix the validation errors');
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
        natureOfComplaint: formData.natureOfComplaint.trim(),
        issueDescription: formData.issueDescription.trim()
      };

      console.log('📋 Submitting complaint:', complaintData);

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/complaints`, complaintData);
      
      if (response.data.success) {
        toast.success(`Complaint submitted successfully! Your ticket number is: ${response.data.data.ticketNumber}`);
        setFormData({
          trackingNumber: '',
          complaintCategory: '',
          natureOfComplaint: '',
          issueDescription: '',
          priority: 'Medium'
        });
        setErrors({});
      }
    } catch (error) {
      console.error('❌ Complaint submission error:', error);
      if (error.response?.status === 404) {
        toast.error('Invalid tracking number. Please check and try again.');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.message || 'Please check your input and try again.');
      } else {
        toast.error(error.response?.data?.message || 'Error submitting complaint. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Hero Section */}
      <section className="relative gradient-bg-danger overflow-hidden py-20">
        <div className="absolute inset-0 hero-pattern"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <i className="fas fa-exclamation-triangle text-white text-3xl"></i>
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
              <div className="card-elevated p-8">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-file-alt text-white text-xl"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-800 dark:text-white mb-2">
                    Submit Your Complaint
                  </h2>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    Please provide as much detail as possible to help us resolve your issue quickly
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Tracking Number */}
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                      <i className="fas fa-hashtag text-primary-500 mr-2"></i>
                      Tracking Number *
                    </label>
                    <input
                      type="text"
                      name="trackingNumber"
                      placeholder="Enter your tracking/reference number"
                      value={formData.trackingNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`input-field ${errors.trackingNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {errors.trackingNumber && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        <i className="fas fa-exclamation-circle mr-1"></i>
                        {errors.trackingNumber}
                      </p>
                    )}
                  </div>

                  {/* Complaint Category */}
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                      <i className="fas fa-list text-primary-500 mr-2"></i>
                      Complaint Category *
                    </label>
                    <select
                      name="complaintCategory"
                      value={formData.complaintCategory}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`input-field ${errors.complaintCategory ? 'border-red-500 focus:border-red-500' : ''}`}
                    >
                      <option value="">Select a category</option>
                      {complaintCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    {errors.complaintCategory && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        <i className="fas fa-exclamation-circle mr-1"></i>
                        {errors.complaintCategory}
                      </p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                      <i className="fas fa-flag text-primary-500 mr-2"></i>
                      Priority Level
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {priorityLevels.map((priority) => (
                        <label
                          key={priority.value}
                          className={`relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            formData.priority === priority.value
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="priority"
                            value={priority.value}
                            checked={formData.priority === priority.value}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className="sr-only"
                          />
                          <span className={`font-medium ${priority.color}`}>
                            {priority.label}
                          </span>
                          {formData.priority === priority.value && (
                            <i className="fas fa-check text-primary-500 absolute top-1 right-1 text-sm"></i>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Nature of Complaint */}
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                      <i className="fas fa-comment text-primary-500 mr-2"></i>
                      Brief Description *
                    </label>
                    <input
                      type="text"
                      name="natureOfComplaint"
                      placeholder="Briefly describe your complaint (10-200 characters)"
                      value={formData.natureOfComplaint}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength={200}
                      className={`input-field ${errors.natureOfComplaint ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.natureOfComplaint ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          <i className="fas fa-exclamation-circle mr-1"></i>
                          {errors.natureOfComplaint}
                        </p>
                      ) : (
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">
                          Minimum 10 characters required
                        </p>
                      )}
                      <span className="text-sm text-secondary-500 dark:text-secondary-400">
                        {formData.natureOfComplaint.length}/200
                      </span>
                    </div>
                  </div>

                  {/* Issue Description */}
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                      <i className="fas fa-file-alt text-primary-500 mr-2"></i>
                      Detailed Description *
                    </label>
                    <textarea
                      name="issueDescription"
                      rows={6}
                      placeholder="Please provide detailed information about the issue, including dates, times, and any relevant circumstances (20-1000 characters)"
                      value={formData.issueDescription}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength={1000}
                      className={`input-field resize-none ${errors.issueDescription ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.issueDescription ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          <i className="fas fa-exclamation-circle mr-1"></i>
                          {errors.issueDescription}
                        </p>
                      ) : (
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">
                          Minimum 20 characters required for detailed description
                        </p>
                      )}
                      <span className="text-sm text-secondary-500 dark:text-secondary-400">
                        {formData.issueDescription.length}/1000
                      </span>
                    </div>
                  </div>

                  {/* Customer Information Display */}
                  <div className="bg-secondary-50 dark:bg-secondary-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-3">
                      <i className="fas fa-user text-primary-500 mr-2"></i>
                      Your Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-secondary-600 dark:text-secondary-400">Name:</span>
                        <span className="ml-2 font-medium text-secondary-900 dark:text-white">
                          {user?.name || 'Not provided'}
                        </span>
                      </div>
                      <div>
                        <span className="text-secondary-600 dark:text-secondary-400">Email:</span>
                        <span className="ml-2 font-medium text-secondary-900 dark:text-white">
                          {user?.email || 'Not provided'}
                        </span>
                      </div>
                      <div>
                        <span className="text-secondary-600 dark:text-secondary-400">Phone:</span>
                        <span className="ml-2 font-medium text-secondary-900 dark:text-white">
                          {user?.phoneNumber || 'Not provided'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-danger flex-1 relative"
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Submitting Complaint...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane mr-2"></i>
                          Submit Complaint
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          trackingNumber: '',
                          complaintCategory: '',
                          natureOfComplaint: '',
                          issueDescription: '',
                          priority: 'Medium'
                        });
                        setErrors({});
                      }}
                      className="btn-outline-secondary"
                    >
                      <i className="fas fa-undo mr-2"></i>
                      Reset Form
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>

            {/* Help Information */}
            <motion.div variants={itemVariants}>
              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                  <i className="fas fa-info-circle text-primary-500 mr-2"></i>
                  What Happens Next?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-ticket-alt text-blue-600 text-lg"></i>
                    </div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-2">Ticket Generated</h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      You'll receive a unique ticket number for tracking your complaint
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-user-tie text-yellow-600 text-lg"></i>
                    </div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-2">Team Review</h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      Our support team will review and investigate your complaint
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-check-circle text-green-600 text-lg"></i>
                    </div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-2">Resolution</h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      We'll work to resolve your issue and keep you updated
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default RaiseComplaint; 