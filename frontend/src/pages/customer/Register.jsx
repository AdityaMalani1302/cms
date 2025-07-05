import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { validators } from '../../utils/validators';
import { PasswordInput, GoogleOAuthButton } from '../../components/ui';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    street: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  // Validation function for individual fields
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'name':
        return validators.name.validate(value);
      case 'email':
        return validators.email.validate(value);
      case 'phoneNumber':
        return validators.phone.validate(value);
      case 'street':
        return validators.address.validate(value);
      case 'city':
        return validators.city.validate(value);
      case 'state':
        return validators.state.validate(value);
      case 'pincode':
        return validators.pincode.validate(value);
      case 'password':
        if (!value || !value.trim()) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (value.length > 50) return 'Password cannot exceed 50 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) return 'Password must contain uppercase, lowercase, and number';
        return null;
      case 'confirmPassword':
        if (!value || !value.trim()) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return null;
      default:
        return null;
    }
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {};
    
    // Personal Information
    newErrors.name = validateField('name', formData.name);
    newErrors.email = validateField('email', formData.email);
    newErrors.phoneNumber = validateField('phoneNumber', formData.phoneNumber);
    newErrors.password = validateField('password', formData.password);
    newErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword);
    
    // Address Information
    newErrors.street = validateField('street', formData.street);
    newErrors.city = validateField('city', formData.city);
    newErrors.state = validateField('state', formData.state);
    newErrors.pincode = validateField('pincode', formData.pincode);
    
    // Remove null errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if form is ready for submission
  const isFormValid = () => {
    // Check if all required fields are filled
    const requiredFields = ['name', 'email', 'phoneNumber', 'password', 'confirmPassword', 'street', 'city', 'state', 'pincode'];
    const hasAllRequiredFields = requiredFields.every(field => formData[field] && formData[field].trim());
    
    // Check if there are any current validation errors for touched fields
    const hasCurrentErrors = Object.keys(errors).some(field => 
      touched[field] && errors[field]
    );
    
    return hasAllRequiredFields && !hasCurrentErrors;
  };

  // Handle input change with validation
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Format value if needed
    let formattedValue = value;
    if (name === 'phoneNumber') {
      formattedValue = validators.phone.format ? validators.phone.format(value) : value;
    } else if (name === 'pincode') {
      formattedValue = validators.pincode.format ? validators.pincode.format(value) : value;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Validate field if it has been touched
    if (touched[name]) {
      const error = validateField(name, formattedValue);
      if (error) {
        setErrors(prev => ({
          ...prev,
          [name]: error
        }));
      }
    }
    
    // Special validation for confirm password when password changes
    if (name === 'password' && touched.confirmPassword && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      if (confirmError) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: confirmError
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.confirmPassword;
          return newErrors;
        });
      }
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
    if (error) {
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Get input class with error styling
  const getInputClass = (fieldName) => {
    const baseClass = "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-secondary-900 dark:text-white bg-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";
    
    if (errors[fieldName] && touched[fieldName]) {
      return `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-500`;
    } else if (!errors[fieldName] && touched[fieldName] && formData[fieldName]) {
      return `${baseClass} border-green-500 focus:border-green-500 focus:ring-green-500`;
    } else {
      return `${baseClass} border-secondary-300 dark:border-secondary-600 focus:border-primary-500 focus:ring-primary-500`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched for validation
    const allFields = ['name', 'email', 'phoneNumber', 'password', 'confirmPassword', 'street', 'city', 'state', 'pincode'];
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    // Validate all fields before submission
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }
    
    setLoading(true);

    try {
      // Transform data to match backend expected format
      const registrationData = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: 'India'
        }
      };
      
      console.log('Submitting registration data:', registrationData);
      const result = await register(registrationData);
      if (result.success) {
        toast.success('Account created successfully!');
        navigate('/customer/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <svg className="h-8 w-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600 dark:text-secondary-400">
            Already have an account?{' '}
            <Link
              to="/customer/login"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Sign in here
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-lg p-6 space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      className={getInputClass('name')}
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your full name"
                    />
                    {errors.name && touched.name && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <i className="fas fa-exclamation-circle text-red-500"></i>
                      </div>
                    )}
                  </div>
                  {errors.name && touched.name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      {errors.name}
                    </p>
                  )}
                </div>
                
                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      className={getInputClass('email')}
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your email address"
                    />
                    {errors.email && touched.email && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <i className="fas fa-exclamation-circle text-red-500"></i>
                      </div>
                    )}
                  </div>
                  {errors.email && touched.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      {errors.email}
                    </p>
                  )}
                </div>
                
                {/* Phone Number */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="phoneNumber"
                      id="phoneNumber"
                      required
                      className={getInputClass('phoneNumber')}
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your phone number"
                      maxLength="10"
                    />
                    {errors.phoneNumber && touched.phoneNumber && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <i className="fas fa-exclamation-circle text-red-500"></i>
                      </div>
                    )}
                  </div>
                  {errors.phoneNumber && touched.phoneNumber && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      {errors.phoneNumber}
                    </p>
                  )}
                  {formData.phoneNumber && (
                    <p className="mt-1 text-xs text-gray-500 text-right">{formData.phoneNumber.length}/10</p>
                  )}
                </div>
                
                {/* Password */}
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
                    autoComplete="new-password"
                    helpText="Must contain uppercase, lowercase, and number (minimum 6 characters)"
                  />
                </div>
                
                {/* Confirm Password */}
                <div className="md:col-span-1">
                  <PasswordInput
                    label="Confirm Password"
                    name="confirmPassword"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.confirmPassword && touched.confirmPassword ? errors.confirmPassword : null}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Address Information</h3>
              <div className="space-y-4">
                {/* Street Address */}
                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                    Street Address *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="street"
                      id="street"
                      required
                      className={getInputClass('street')}
                      value={formData.street}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your street address"
                    />
                    {errors.street && touched.street && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <i className="fas fa-exclamation-circle text-red-500"></i>
                      </div>
                    )}
                  </div>
                  {errors.street && touched.street && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      {errors.street}
                    </p>
                  )}
                </div>
                
                {/* City, State, Pincode */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* City */}
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                      City *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="city"
                        id="city"
                        required
                        className={getInputClass('city')}
                        value={formData.city}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter city"
                      />
                      {errors.city && touched.city && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <i className="fas fa-exclamation-circle text-red-500"></i>
                        </div>
                      )}
                    </div>
                    {errors.city && touched.city && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <i className="fas fa-exclamation-triangle mr-1"></i>
                        {errors.city}
                      </p>
                    )}
                  </div>
                  
                  {/* State */}
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                      State *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="state"
                        id="state"
                        required
                        className={getInputClass('state')}
                        value={formData.state}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter state"
                      />
                      {errors.state && touched.state && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <i className="fas fa-exclamation-circle text-red-500"></i>
                        </div>
                      )}
                    </div>
                    {errors.state && touched.state && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <i className="fas fa-exclamation-triangle mr-1"></i>
                        {errors.state}
                      </p>
                    )}
                  </div>
                  
                  {/* Pincode */}
                  <div>
                    <label htmlFor="pincode" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                      Pincode *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="pincode"
                        id="pincode"
                        required
                        className={getInputClass('pincode')}
                        value={formData.pincode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter pincode"
                        maxLength="6"
                      />
                      {errors.pincode && touched.pincode && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <i className="fas fa-exclamation-circle text-red-500"></i>
                        </div>
                      )}
                    </div>
                    {errors.pincode && touched.pincode && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <i className="fas fa-exclamation-triangle mr-1"></i>
                        {errors.pincode}
                      </p>
                    )}
                    {formData.pincode && (
                      <p className="mt-1 text-xs text-gray-500 text-right">{formData.pincode.length}/6</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Or sign up with
              </span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <div>
            <GoogleOAuthButton mode="register" />
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              ← Back to Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register; 