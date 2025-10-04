import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../utils/toastUtils';
import { useAuth } from '../../context/AuthContext';
import { validators } from '../../utils/validators';
import { PasswordInput } from '../../components/ui';

const DeliveryAgentLogin = () => {
  const navigate = useNavigate();
  const { deliveryAgentLogin } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  // Validation function for individual fields
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'email':
        return validators.email.validate(value);
      case 'password':
        if (!value || !value.trim()) return 'Password is required';
        if (value.length < 1) return 'Password cannot be empty';
        return null;
      default:
        return null;
    }
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {};
    
    newErrors.email = validateField('email', formData.email);
    newErrors.password = validateField('password', formData.password);
    
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
    
    // Validate all fields before submission
    if (!validateForm()) {
      showToast.error('Please enter valid credentials');
      return;
    }
    
    setLoading(true);
    try {
      const result = await deliveryAgentLogin(formData.email, formData.password);
      
      if (result.success) {
        showToast.success('Login successful!');
        console.log('Login successful, navigating to dashboard...');
        navigate('/delivery-agent/dashboard');
      } else {
        showToast.error(result.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      const message = error?.message || 'Login failed. Please try again.';
      showToast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Login Form */}
      <div className="flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md"
        >
          {/* Logo/Icon */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-truck text-white text-2xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Delivery Agent Portal
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sign in with your email and password provided by admin
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-envelope text-gray-400"></i>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your email address"
                  autoComplete="username"
                  required
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div>
              <PasswordInput
                label="Password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password ? errors.password : null}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                icon="fas fa-lock"
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex justify-center py-3 px-8 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[280px]"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Sign In
                  </div>
                )}
              </motion.button>
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Need help accessing your account?
              </p>
              <div className="flex justify-center space-x-4">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  <i className="fas fa-phone mr-1"></i>
                  Call Support
                </button>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  <i className="fas fa-envelope mr-1"></i>
                  Email Help
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DeliveryAgentLogin; 