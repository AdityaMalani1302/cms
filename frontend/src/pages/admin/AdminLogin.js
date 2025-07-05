import React, { useState } from 'react';
// import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { validators } from '../../utils/validators';
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
      }
    } catch (error) {
      // Error handled in adminLogin function
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white dark:bg-secondary-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-user-shield text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">Admin Login</h1>
          <p className="text-secondary-600 dark:text-secondary-400">Access the admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl focus:ring-4 focus:ring-primary-300 focus:border-primary-500 transition-all duration-300 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500"
              placeholder="Enter your username"
            />
            {errors.username && <p className="text-red-600 dark:text-red-400 text-sm">{errors.username}</p>}
          </div>

          <div className="mb-6">
            <PasswordInput
              label="Password"
              name="password"
              id="password"
              value={credentials.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password ? errors.password : null}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-4 focus:ring-primary-300 focus:border-primary-500 transition-all duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Signing in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt mr-2"></i>
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin; 