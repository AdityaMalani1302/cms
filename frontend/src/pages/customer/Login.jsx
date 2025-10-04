import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { validators } from '../../utils/validators';
import { PasswordInput } from '../../components/ui';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const { customerLogin } = useAuth();
  const navigate = useNavigate();

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
      toast.error('Please enter valid credentials');
      return;
    }
    
    setLoading(true);

    try {
      const result = await customerLogin(formData.email, formData.password);
      if (result.success) {
        toast.success('Login successful!');
        navigate('/customer/dashboard');
      } else {
        toast.error(result.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 transform transition-transform hover:scale-105 hover:rotate-3">
            <i className="fas fa-box-open text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Customer Portal</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your shipments
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            New customer?{' '}
            <Link
              to="/customer/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Create a new account
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-envelope text-gray-400 group-hover:text-blue-500 transition-colors"></i>
              </div>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Enter your email address"
                autoComplete="email"
              />
            </div>
            {touched.email && errors.email && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm mt-1 flex items-center"
              >
                <i className="fas fa-exclamation-circle mr-1"></i>
                {errors.email}
              </motion.p>
            )}
          </div>

          <div>
            <PasswordInput
              label="Password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password && touched.password ? errors.password : null}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              icon="fas fa-lock"
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
            />
          </div>

          <div className="flex justify-center">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex justify-center py-3 px-8 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[280px] transition-all duration-300"
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
            <div className="flex justify-center space-x-4 flex-wrap gap-2">
              <Link
                to="/forgot-password"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center"
              >
                <i className="fas fa-key mr-1"></i>
                Forgot Password?
              </Link>
              <Link
                to="/"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center"
              >
                <i className="fas fa-arrow-left mr-1"></i>
                Back to Home
              </Link>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center">
                <i className="fas fa-question-circle mr-1"></i>
                Get Support
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login; 