import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';

const AddAgent = () => {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);

  // Simple form state
  const [formData, setFormData] = useState({
    agentName: '',
    agentEmail: '',
    agentMobileNumber: '',
    vehicleType: '',
    assignedBranch: '',
    password: '',
    confirmPassword: ''
  });

  // Load branches on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const token = sessionStorage.getItem('adminToken');
        const response = await axios.get(`${baseURL}/api/admin/branches`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setBranches(response.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch branches:', error);
        toast.error('Failed to load branches');
      }
    };

    fetchBranches();
  }, []);

  // Simple validation functions
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone) => {
    const re = /^[6-9]\d{9}$/;
    return re.test(phone.replace(/\D/g, ''));
  };


  const validatePassword = (password) => {
    return password.length >= 6;
  };

  // Simple input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Format specific fields
    let formattedValue = value;
    if (name === 'agentMobileNumber') {
      formattedValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  // Form validation
  const validateForm = () => {
    const errors = [];

    if (!formData.agentName.trim()) {
      errors.push('Agent name is required');
    }

    if (!formData.agentEmail.trim()) {
      errors.push('Email is required');
    } else if (!validateEmail(formData.agentEmail)) {
      errors.push('Please enter a valid email address');
    }

    if (!formData.agentMobileNumber.trim()) {
      errors.push('Mobile number is required');
    } else if (!validatePhone(formData.agentMobileNumber)) {
      errors.push('Please enter a valid 10-digit mobile number');
    }

    if (!formData.vehicleType) {
      errors.push('Vehicle type is required');
    }

    if (!formData.assignedBranch) {
      errors.push('Branch assignment is required');
    }

    if (!formData.password) {
      errors.push('Password is required');
    } else if (!validatePassword(formData.password)) {
      errors.push('Password must be at least 6 characters long');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match');
    }

    if (errors.length > 0) {
      toast.error(errors[0]); // Show first error
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setFormData({
      agentName: '',
      agentEmail: '',
      agentMobileNumber: '',
      vehicleType: '',
      assignedBranch: '',
      password: '',
      confirmPassword: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const token = sessionStorage.getItem('adminToken');
      
      // Prepare data for submission (exclude confirmPassword)
      const { confirmPassword, ...submitData } = formData;
      
      const response = await axios.post(`${baseURL}/api/admin/delivery-agents`, submitData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        toast.success('Delivery agent added successfully');
        resetForm();
      }
    } catch (error) {
      console.error('Add agent error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          'Failed to add delivery agent. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Add New Delivery Agent
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Fill in the information below to register a new delivery agent
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">
            <i className="fas fa-user mr-2"></i>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="agentName"
                value={formData.agentName}
                onChange={handleInputChange}
                placeholder="Enter full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="agentEmail"
                value={formData.agentEmail}
                onChange={handleInputChange}
                placeholder="Enter email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="agentMobileNumber"
                value={formData.agentMobileNumber}
                onChange={handleInputChange}
                placeholder="Enter 10-digit mobile number"
                maxLength="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned Branch <span className="text-red-500">*</span>
              </label>
              <select
                name="assignedBranch"
                value={formData.assignedBranch}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Select a branch</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.branchName} - {branch.branchCity}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-4">
            <i className="fas fa-motorcycle mr-2"></i>
            Vehicle Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Select vehicle type</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Scooter">Scooter</option>
                <option value="Car">Car</option>
                <option value="Van">Van</option>
                <option value="Bicycle">Bicycle</option>
              </select>
            </div>

          </div>
        </div>

        {/* Login Credentials */}
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-4">
            <i className="fas fa-lock mr-2"></i>
            Login Credentials
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password (min 6 characters)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                minLength="6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-times mr-2"></i>
            Clear Form
          </button>
          
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Adding Agent...
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2"></i>
                Add Agent
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default AddAgent;