import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showToast } from '../../utils/toastUtils';
import { useAuth } from '../../context/AuthContext';
import { validators } from '../../utils/validators';
import { AddressInput } from '../../components/ui';

const BookCourier = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/customer/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    pickupAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    deliveryAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    recipientName: '',
    recipientPhone: '',
    packageType: 'Document',
    weight: '',
    deliverySpeed: 'Standard',
    description: '',
    pickupDate: ''
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [loading, setLoading] = useState(false);

  // Helper function to get axios with proper headers
  const getAxiosConfig = () => {
    const token = sessionStorage.getItem('customerToken');
    return {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    };
  };

  useEffect(() => {
    // Set minimum pickup date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, pickupDate: minDate }));
  }, []);

  useEffect(() => {
    // Calculate cost when weight or delivery speed changes
    if (formData.weight && parseFloat(formData.weight) > 0 && formData.deliverySpeed) {
      calculateCost();
    }
  }, [formData.weight, formData.deliverySpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateCost = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/bookings/estimate`, {
        params: {
          weight: formData.weight,
          deliverySpeed: formData.deliverySpeed
        },
        ...getAxiosConfig()
      });
      
      if (response.data.success) {
        setEstimatedCost(response.data.estimatedCost);
      }
    } catch (error) {
      console.error('Error calculating cost:', error);
      if (error.response?.status === 401) {
        showToast.error('Session expired. Please login again.');
        navigate('/customer/login');
      }
    }
  };

  // Validation function for individual fields
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'pickupAddress.street':
      case 'deliveryAddress.street':
        return validators.address.validate(value);
      case 'pickupAddress.city':
        return validators.city.validate(value, formData.pickupAddress.state);
      case 'deliveryAddress.city':
        return validators.city.validate(value, formData.deliveryAddress.state);
      case 'pickupAddress.state':
      case 'deliveryAddress.state':
        return validators.state.validate(value);
      case 'pickupAddress.pincode':
        return validators.pincode.validate(value, formData.pickupAddress.city, formData.pickupAddress.state);
      case 'deliveryAddress.pincode':
        return validators.pincode.validate(value, formData.deliveryAddress.city, formData.deliveryAddress.state);
      case 'recipientName':
        return validators.name.validate(value);
      case 'recipientPhone':
        return validators.phone.validate(value);
      case 'weight':
        return validators.weight.validate(value);
      case 'packageType':
        return validators.select.validate(value, 'package type');
      case 'deliverySpeed':
        return validators.select.validate(value, 'delivery speed');
      case 'description':
        return null; // Optional field, no validation required
      case 'pickupDate':
        if (!value) return 'Pickup date is required';
        const selectedDate = new Date(value);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        if (selectedDate < tomorrow) return 'Pickup date must be at least tomorrow';
        return null;
      default:
        return null;
    }
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {};
    
    // Validate pickup address
    newErrors['pickupAddress.street'] = validateField('pickupAddress.street', formData.pickupAddress.street);
    newErrors['pickupAddress.state'] = validateField('pickupAddress.state', formData.pickupAddress.state);
    newErrors['pickupAddress.city'] = validateField('pickupAddress.city', formData.pickupAddress.city);
    newErrors['pickupAddress.pincode'] = validateField('pickupAddress.pincode', formData.pickupAddress.pincode);
    
    // Validate delivery address
    newErrors['deliveryAddress.street'] = validateField('deliveryAddress.street', formData.deliveryAddress.street);
    newErrors['deliveryAddress.state'] = validateField('deliveryAddress.state', formData.deliveryAddress.state);
    newErrors['deliveryAddress.city'] = validateField('deliveryAddress.city', formData.deliveryAddress.city);
    newErrors['deliveryAddress.pincode'] = validateField('deliveryAddress.pincode', formData.deliveryAddress.pincode);
    
    // Validate recipient details
    newErrors.recipientName = validateField('recipientName', formData.recipientName);
    newErrors.recipientPhone = validateField('recipientPhone', formData.recipientPhone);
    
    // Validate package details
    newErrors.packageType = validateField('packageType', formData.packageType);
    newErrors.weight = validateField('weight', formData.weight);
    newErrors.deliverySpeed = validateField('deliverySpeed', formData.deliverySpeed);
    // Description is optional, skip validation
    // newErrors.description = validateField('description', formData.description);
    newErrors.pickupDate = validateField('pickupDate', formData.pickupDate);
    
    // Remove null errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle address change from AddressInput component
  const handleAddressChange = (fieldName, value, updatedAddress) => {
    if (fieldName.includes('.')) {
      const [parent] = fieldName.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: updatedAddress
      }));
    }
    
    // Validate field if it has been touched
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  };

  // Handle input change with validation (for non-address fields)
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Format value if needed
    let formattedValue = value;
    if (name === 'recipientPhone') {
      formattedValue = validators.phone.format ? validators.phone.format(value) : value;
    } else if (name.includes('pincode')) {
      formattedValue = validators.pincode.format ? validators.pincode.format(value) : value;
    } else if (name === 'weight') {
      formattedValue = validators.weight.format ? validators.weight.format(value) : value;
    }
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: formattedValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    }
    
    // Validate field if it has been touched
    if (touched[name]) {
      const error = validateField(name, formattedValue);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  // Handle field blur for validation
  const handleBlur = (e) => {
    if (!e || !e.target) {
      console.error('handleBlur: event or event.target is undefined');
      return;
    }
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    const value = name.includes('.') 
      ? name.split('.').reduce((obj, key) => obj?.[key], formData)
      : formData[name];
    
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields before submission
    if (!validateForm()) {
      showToast.error('Please fix the validation errors before submitting');
      return;
    }
    
    setLoading(true);

    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/bookings`, formData, getAxiosConfig());
      
      if (response.data.success) {
        showToast.success('Courier booked successfully!');
        navigate('/customer/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create booking';
      showToast.error(message);
      
      if (error.response?.status === 401) {
        showToast.error('Session expired. Please login again.');
        navigate('/customer/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
              Book a Courier
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Pickup Address */}
              <AddressInput
                address={formData.pickupAddress}
                onChange={handleAddressChange}
                onBlur={handleBlur}
                errors={errors}
                touched={touched}
                prefix="pickupAddress"
                title="Pickup Address"
              />

              {/* Delivery Address */}
              <AddressInput
                address={formData.deliveryAddress}
                onChange={handleAddressChange}
                onBlur={handleBlur}
                errors={errors}
                touched={touched}
                prefix="deliveryAddress"
                title="Delivery Address"
              />

              {/* Recipient Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Recipient Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      name="recipientName"
                      required
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      value={formData.recipientName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors['recipientName'] && (
                      <p className="text-red-500 text-xs mt-1">{errors['recipientName']}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recipient Phone
                    </label>
                    <input
                      type="tel"
                      name="recipientPhone"
                      required
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      value={formData.recipientPhone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors['recipientPhone'] && (
                      <p className="text-red-500 text-xs mt-1">{errors['recipientPhone']}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Package Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Package Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Package Type
                    </label>
                    <select
                      name="packageType"
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      value={formData.packageType}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value="Document">Document</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Fragile">Fragile</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Food">Food</option>
                      <option value="Others">Others</option>
                    </select>
                    {errors['packageType'] && (
                      <p className="text-red-500 text-xs mt-1">{errors['packageType']}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      step="0.1"
                      min="0.1"
                      max="50"
                      required
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      value={formData.weight}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors['weight'] && (
                      <p className="text-red-500 text-xs mt-1">{errors['weight']}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Delivery Speed
                    </label>
                    <select
                      name="deliverySpeed"
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      value={formData.deliverySpeed}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value="Standard">Standard (3 days)</option>
                      <option value="Express">Express (1 day)</option>
                      <option value="Same-day">Same-day</option>
                    </select>
                    {errors['deliverySpeed'] && (
                      <p className="text-red-500 text-xs mt-1">{errors['deliverySpeed']}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Package Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    value={formData.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors['description'] && (
                    <p className="text-red-500 text-xs mt-1">{errors['description']}</p>
                  )}
                </div>
              </div>

              {/* Pickup Date */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Pickup Date
                </h3>
                <input
                  type="date"
                  name="pickupDate"
                  required
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  className="block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  value={formData.pickupDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {errors['pickupDate'] && (
                  <p className="text-red-500 text-xs mt-1">{errors['pickupDate']}</p>
                )}
              </div>

              {/* Cost Estimation */}
              {estimatedCost > 0 && (
                <div className="bg-primary-50 dark:bg-primary-900 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-primary-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-primary-800 dark:text-primary-200">
                        Estimated Cost: ₹{estimatedCost}
                      </h3>
                      <div className="mt-2 text-sm text-primary-700 dark:text-primary-300">
                        <p>This is an estimated cost based on weight and delivery speed.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/customer/dashboard')}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Book Courier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCourier; 