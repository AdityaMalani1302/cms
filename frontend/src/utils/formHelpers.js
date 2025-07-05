/**
 * Utility functions for form data handling
 * Prevents [object Object] display issues in forms
 */

/**
 * Safely converts any value to a string for form inputs
 * @param {any} value - The value to convert
 * @returns {string} - Safe string value for form inputs
 */
export const safeStringValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    // Handle objects by returning empty string to avoid [object Object]
    return '';
  }
  
  return String(value);
};

/**
 * Prepares form data from API response by converting all values to safe strings
 * @param {object} data - The raw data object from API
 * @returns {object} - Prepared form data with safe string values
 */
export const prepareFormData = (data) => {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const prepared = {};
  Object.keys(data).forEach(key => {
    prepared[key] = safeStringValue(data[key]);
  });
  
  return prepared;
};

/**
 * Safely gets a nested object value as a string
 * @param {object} obj - The object to get value from
 * @param {string} path - Dot notation path (e.g., 'user.address.street')
 * @param {string} defaultValue - Default value if path doesn't exist
 * @returns {string} - Safe string value
 */
export const getNestedValue = (obj, path, defaultValue = '') => {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return safeStringValue(current) || defaultValue;
};

/**
 * Validates that form data doesn't contain [object Object] values
 * @param {object} formData - The form data to validate
 * @returns {boolean} - True if valid, false if contains objects
 */
export const validateFormData = (formData) => {
  if (!formData || typeof formData !== 'object') {
    return false;
  }
  
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'object' && value !== null) {
      console.warn(`Form field '${key}' contains an object:`, value);
      return false;
    }
    
    if (String(value) === '[object Object]') {
      console.warn(`Form field '${key}' displays as [object Object]`);
      return false;
    }
  }
  
  return true;
};

/**
 * Safe form field value getter with fallback
 * @param {object} formData - The form data object
 * @param {string} fieldName - The field name to get
 * @param {string} fallback - Fallback value
 * @returns {string} - Safe field value
 */
export const getFieldValue = (formData, fieldName, fallback = '') => {
  if (!formData || !fieldName) {
    return fallback;
  }
  
  const value = formData[fieldName];
  return safeStringValue(value) || fallback;
};

/**
 * Cleans form data before submitting to API
 * Removes empty strings and converts back to appropriate types
 * @param {object} formData - The form data to clean
 * @param {object} fieldTypes - Optional field type definitions
 * @returns {object} - Cleaned form data
 */
export const cleanFormData = (formData, fieldTypes = {}) => {
  const cleaned = {};
  
  Object.entries(formData).forEach(([key, value]) => {
    // Skip empty strings unless explicitly required
    if (value === '') {
      return;
    }
    
    // Convert based on field type if specified
    const fieldType = fieldTypes[key];
    switch (fieldType) {
      case 'number':
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          cleaned[key] = numValue;
        }
        break;
      case 'boolean':
        cleaned[key] = value === 'true' || value === true;
        break;
      case 'array':
        if (Array.isArray(value)) {
          cleaned[key] = value;
        } else if (typeof value === 'string') {
          cleaned[key] = value.split(',').map(item => item.trim()).filter(Boolean);
        }
        break;
      default:
        cleaned[key] = value;
    }
  });
  
  return cleaned;
};

/**
 * Debug function to log form data and check for issues
 * @param {object} formData - The form data to debug
 * @param {string} context - Context description for logging
 */
export const debugFormData = (formData, context = 'Form Data') => {
  console.group(`🔍 ${context} Debug`);
  
  Object.entries(formData).forEach(([key, value]) => {
    const type = typeof value;
    const stringValue = String(value);
    
    if (type === 'object' && value !== null) {
      console.warn(`❌ ${key}:`, value, '(Object - will show as [object Object])');
    } else if (stringValue === '[object Object]') {
      console.error(`🚨 ${key}: [object Object] detected!`);
    } else {
      console.log(`✅ ${key}:`, value, `(${type})`);
    }
  });
  
  console.groupEnd();
  
  const isValid = validateFormData(formData);
  console.log(`📋 Form validation: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  return isValid;
}; 