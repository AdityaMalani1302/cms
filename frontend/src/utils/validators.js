// Comprehensive validation utilities for CMS application
import { useState } from 'react';

export const validators = {
  // Name validation
  name: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Name is required';
      if (value.trim().length < 2) return 'Name must be at least 2 characters';
      if (value.trim().length > 50) return 'Name cannot exceed 50 characters';
      if (!/^[a-zA-Z\s.''-]+$/.test(value)) return 'Name can only contain letters, spaces, and common punctuation';
      return null;
    }
  },

  // Email validation
  email: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Please enter a valid email address';
      if (value.length > 100) return 'Email cannot exceed 100 characters';
      return null;
    }
  },

  // Phone number validation (Indian format)
  phone: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Phone number is required';
      const phoneRegex = /^[6-9]\d{9}$/;
      const cleanPhone = value.replace(/\D/g, '');
      if (!phoneRegex.test(cleanPhone)) return 'Please enter a valid 10-digit Indian phone number';
      return null;
    },
    format: (value) => {
      const cleaned = value.replace(/\D/g, '');
      return cleaned.slice(0, 10);
    }
  },

  // Address validation
  address: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Address is required';
      if (value.trim().length < 10) return 'Please provide a more detailed address (at least 10 characters)';
      if (value.trim().length > 200) return 'Address cannot exceed 200 characters';
      if (!/^[a-zA-Z0-9\s,.-/#]+$/.test(value)) return 'Address contains invalid characters';
      return null;
    }
  },

  // City validation
  city: {
    validate: (value) => {
      if (!value || !value.trim()) return 'City is required';
      if (value.trim().length < 2) return 'City name must be at least 2 characters';
      if (value.trim().length > 50) return 'City name cannot exceed 50 characters';
      if (!/^[a-zA-Z\s.-]+$/.test(value)) return 'City name can only contain letters, spaces, dots, and hyphens';
      return null;
    }
  },

  // State validation
  state: {
    validate: (value) => {
      if (!value || !value.trim()) return 'State is required';
      if (value.trim().length < 2) return 'State name must be at least 2 characters';
      if (value.trim().length > 50) return 'State name cannot exceed 50 characters';
      if (!/^[a-zA-Z\s.-]+$/.test(value)) return 'State name can only contain letters, spaces, dots, and hyphens';
      return null;
    }
  },

  // Pincode validation (Indian format)
  pincode: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Pincode is required';
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(value)) return 'Please enter a valid 6-digit Indian pincode';
      return null;
    },
    format: (value) => {
      return value.replace(/\D/g, '').slice(0, 6);
    }
  },

  // Tracking number validation
  trackingNumber: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Tracking number is required';
      if (value.trim().length < 5) return 'Tracking number must be at least 5 characters';
      if (value.trim().length > 50) return 'Tracking number cannot exceed 50 characters';
      if (!/^[a-zA-Z0-9]+$/.test(value.trim())) return 'Tracking number can only contain letters and numbers';
      return null;
    }
  },

  // Weight validation
  weight: {
    validate: (value) => {
      if (!value || !value.toString().trim()) return 'Weight is required';
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return 'Weight must be a valid number';
      if (numValue <= 0) return 'Weight must be greater than 0';
      if (numValue > 1000) return 'Weight cannot exceed 1000 kg';
      return null;
    },
    format: (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? '' : num.toString();
    }
  },

  // Package description validation
  description: {
    validate: (value, minLength = 10, maxLength = 500) => {
      if (!value || !value.trim()) return 'Description is required';
      if (value.trim().length < minLength) return `Description must be at least ${minLength} characters`;
      if (value.trim().length > maxLength) return `Description cannot exceed ${maxLength} characters`;
      return null;
    }
  },

  // Brief description validation (for complaints)
  briefDescription: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Brief description is required';
      if (value.trim().length < 10) return 'Brief description must be at least 10 characters';
      if (value.trim().length > 200) return 'Brief description cannot exceed 200 characters';
      return null;
    }
  },

  // Detailed description validation (for complaints)
  detailedDescription: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Detailed description is required';
      if (value.trim().length < 20) return 'Detailed description must be at least 20 characters';
      if (value.trim().length > 1000) return 'Detailed description cannot exceed 1000 characters';
      return null;
    }
  },

  // Package dimensions validation
  dimension: {
    validate: (value, dimensionType = 'dimension') => {
      if (!value || !value.toString().trim()) return `${dimensionType} is required`;
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return `${dimensionType} must be a valid number`;
      if (numValue <= 0) return `${dimensionType} must be greater than 0`;
      if (numValue > 500) return `${dimensionType} cannot exceed 500 cm`;
      return null;
    }
  },

  // Price validation
  price: {
    validate: (value) => {
      if (!value || !value.toString().trim()) return 'Price is required';
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return 'Price must be a valid number';
      if (numValue < 0) return 'Price cannot be negative';
      if (numValue > 100000) return 'Price cannot exceed ₹1,00,000';
      return null;
    }
  },

  // Generic text validation
  text: {
    validate: (value, fieldName, minLength = 1, maxLength = 100) => {
      if (!value || !value.trim()) return `${fieldName} is required`;
      if (value.trim().length < minLength) return `${fieldName} must be at least ${minLength} character(s)`;
      if (value.trim().length > maxLength) return `${fieldName} cannot exceed ${maxLength} characters`;
      return null;
    }
  },

  // Dropdown/Select validation
  select: {
    validate: (value, fieldName) => {
      if (!value || value === '' || value === null || value === undefined) {
        return `Please select a ${fieldName.toLowerCase()}`;
      }
      return null;
    }
  }
};

// Utility function to validate all fields
export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  Object.keys(validationRules).forEach(fieldName => {
    const rules = validationRules[fieldName];
    const value = formData[fieldName];
    
    if (rules.required !== false) { // Default to required unless explicitly set to false
      const error = rules.validator(value);
      if (error) {
        errors[fieldName] = error;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Real-time validation hook
export const useFormValidation = (initialState, validationRules) => {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;
    
    return rules.validator(value);
  };

  const handleChange = (fieldName, value) => {
    // Format value if formatter exists
    const rules = validationRules[fieldName];
    const formattedValue = rules?.formatter ? rules.formatter(value) : value;
    
    setFormData(prev => ({
      ...prev,
      [fieldName]: formattedValue
    }));

    // Validate if field has been touched
    if (touched[fieldName]) {
      const error = validateField(fieldName, formattedValue);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  };

  const handleBlur = (fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    const error = validateField(fieldName, formData[fieldName]);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  const validateAll = () => {
    const newErrors = {};
    const newTouched = {};
    
    Object.keys(validationRules).forEach(fieldName => {
      newTouched[fieldName] = true;
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });
    
    setTouched(newTouched);
    setErrors(newErrors);
    
    return Object.keys(newErrors).length === 0;
  };

  return {
    formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    setFormData,
    isValid: Object.keys(errors).length === 0
  };
};

export default validators; 