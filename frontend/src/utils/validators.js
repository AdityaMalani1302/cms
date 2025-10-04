// Comprehensive validation utilities for CMS application
import { useState } from 'react';
import { isValidState, isValidCityForState } from '../data/statesAndCities';
import { isValidPincode } from '../data/pincodes';

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
      // SECURITY FIX: Remove potentially dangerous characters
      const sanitized = value.replace(/[<>"']/g, '');
      if (sanitized !== value) return 'Address contains invalid characters';
      if (!/^[a-zA-Z0-9\s,.-/#]+$/.test(sanitized)) return 'Address contains invalid characters';
      return null;
    }
  },

  // City validation
  city: {
    validate: (value, state = null) => {
      if (!value || !value.trim()) return 'City is required';
      if (value.trim().length < 2) return 'City name must be at least 2 characters';
      if (value.trim().length > 50) return 'City name cannot exceed 50 characters';
      if (!/^[a-zA-Z\s.-]+$/.test(value)) return 'City name can only contain letters, spaces, dots, and hyphens';
      
      // Validate against predefined city list if state is provided
      if (state && !isValidCityForState(value, state)) {
        return 'Please select a valid city from the dropdown';
      }
      
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
      
      // Validate against predefined state list
      if (!isValidState(value)) {
        return 'Please select a valid state from the dropdown';
      }
      
      return null;
    }
  },

  // Pincode validation (Indian format)
  pincode: {
    validate: (value, city = null, state = null) => {
      if (!value || !value.trim()) return 'Pincode is required';
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(value)) return 'Please enter a valid 6-digit Indian pincode';
      
      // Enhanced validation: Check if pincode belongs to selected city and state
      if (city && state) {
        if (!isValidPincode(value, city, state)) {
          return `This pincode is not valid for ${city}, ${state}. Please enter a correct pincode.`;
        }
      }
      
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
  },

  // Password validation - matches backend requirements
  password: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Password is required';
      if (value.length < 6) return 'Password must be at least 6 characters';
      if (value.length > 12) return 'Password cannot exceed 12 characters';
      
      // Backend requirements
      if (!/(?=.*[a-z])/.test(value)) {
        return 'Password must contain at least one lowercase letter';
      }
      if (!/(?=.*[A-Z])/.test(value)) {
        return 'Password must contain at least one uppercase letter';
      }
      if (!/(?=.*\d)/.test(value)) {
        return 'Password must contain at least one number';
      }
      if (!/(?=.*[!@#$%^&*()_+\-=[{\]};'":|,.<>/?])/.test(value)) {
        return 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)';
      }
      
      // Check for common patterns
      const commonPatterns = ['password', '12345', 'qwerty', 'admin'];
      if (commonPatterns.some(pattern => value.toLowerCase().includes(pattern))) {
        return 'Password cannot contain common patterns';
      }
      
      // Check for repeated characters (more than 3 consecutive)
      if (/(.)\1{3,}/.test(value)) {
        return 'Password cannot contain more than 3 consecutive identical characters';
      }
      
      return null;
    }
  },

  // Confirm password validation
  confirmPassword: {
    validate: (value, originalPassword) => {
      if (!value || !value.trim()) return 'Please confirm your password';
      if (value !== originalPassword) return 'Passwords do not match';
      return null;
    }
  },

  // Vehicle number validation (Indian format)
  vehicleNumber: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Vehicle number is required';
      // Indian vehicle number patterns:
      // Old format: XX-XX-XX-XXXX (e.g., MH-01-AB-1234)
      // New format: XX-XX-XXXXXXXX (e.g., MH-01-BH123456)
      const vehicleRegex = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,2}[-\s]?[0-9]{1,4}$|^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{2}[0-9]{6}$/i;
      if (!vehicleRegex.test(value.trim())) {
        return 'Please enter a valid Indian vehicle number (e.g., MH-01-AB-1234 or MH-01-BH123456)';
      }
      return null;
    },
    format: (value) => {
      // Clean and format vehicle number
      const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      // Format based on length
      if (cleaned.length >= 10) {
        // New format: XX XX XX XXXXXX
        return cleaned.replace(/^([A-Z]{2})([0-9]{1,2})([A-Z]{2})([0-9]{6}).*/, '$1-$2-$3$4');
      } else if (cleaned.length >= 8) {
        // Old format: XX XX XX XXXX
        return cleaned.replace(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,2})([0-9]{1,4}).*/, '$1-$2-$3-$4');
      }
      
      return cleaned;
    }
  },

  // Agent ID validation
  agentId: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Agent ID is required';
      if (value.trim().length < 5) return 'Agent ID must be at least 5 characters';
      if (value.trim().length > 20) return 'Agent ID cannot exceed 20 characters';
      if (!/^[A-Z0-9]+$/i.test(value.trim())) return 'Agent ID can only contain letters and numbers';
      return null;
    },
    format: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  },

  // Branch validation
  branch: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Branch is required';
      if (value.trim().length < 2) return 'Branch name must be at least 2 characters';
      if (value.trim().length > 100) return 'Branch name cannot exceed 100 characters';
      return null;
    }
  },

  // License number validation (for delivery agents)
  licenseNumber: {
    validate: (value, vehicleType) => {
      if (!value || !value.trim()) return 'License number is required';
      
      // Different validation based on vehicle type
      if (vehicleType === 'bike') {
        // Two-wheeler license format
        const bikeRegex = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/;
        if (!bikeRegex.test(value.replace(/[^A-Z0-9]/g, ''))) {
          return 'Please enter a valid two-wheeler license number';
        }
      } else {
        // Four-wheeler license format
        const carRegex = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/;
        if (!carRegex.test(value.replace(/[^A-Z0-9]/g, ''))) {
          return 'Please enter a valid driving license number';
        }
      }
      
      return null;
    },
    format: (value) => {
      const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      // Format as XX00 0000 0000000
      return cleaned.replace(/^([A-Z]{2})([0-9]{2})([0-9]{4})([0-9]{7}).*/, '$1$2 $3 $4');
    }
  },

  // Emergency contact validation
  emergencyContact: {
    validate: (value) => {
      if (!value || !value.trim()) return 'Emergency contact is required';
      const phoneRegex = /^[6-9]\d{9}$/;
      const cleanPhone = value.replace(/\D/g, '');
      if (!phoneRegex.test(cleanPhone)) return 'Please enter a valid 10-digit emergency contact number';
      return null;
    },
    format: (value) => {
      const cleaned = value.replace(/\D/g, '');
      return cleaned.slice(0, 10);
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