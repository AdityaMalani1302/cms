import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { PasswordInput } from '../../components/ui';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  // Validation function for individual fields
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'username':
        if (!value || !value.trim()) return 'Username is required';
        if (value.trim().length < 3) return 'Username must be at least 3 characters';
        if (value.trim().length > 50) return 'Username cannot exceed 50 characters';
        return null;
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
    
    newErrors.username = validateField('username', credentials.username);
    newErrors.password = validateField('password', credentials.password);
    
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
    
    setCredentials(prev => ({
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
    
    const error = validateField(name, credentials[name]);
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
      const result = await adminLogin(credentials.username, credentials.password);
      if (result.success) {
        toast.success('Login successful!');
        navigate('/admin/dashboard');
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
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-user-shield text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Admin Login</h1>
          <p className="text-gray-600 dark:text-gray-400">Access the admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-user text-gray-400"></i>
              </div>
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your username"
              />
            </div>
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
          </div>

          <div>
            <PasswordInput
              label="Password"
              name="password"
              id="password"
              value={credentials.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              icon="fas fa-lock"
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

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
            <div className="flex justify-center space-x-4 flex-wrap gap-2">
              <Link
                to="/admin/recovery"
                className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors flex items-center"
              >
                <i className="fas fa-key mr-1"></i>
                Emergency Recovery
              </Link>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center">
                <i className="fas fa-phone mr-1"></i>
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin; 