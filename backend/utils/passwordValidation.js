const validator = require('validator');

// Password complexity requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
  blacklistedPasswords: [
    'password', 'password123', '12345678', 'qwerty123', 'admin123',
    'courier123', 'delivery123', 'manager123', 'user123', 'test123'
  ]
};

/**
 * Validate password complexity
 * @param {string} password - The password to validate
 * @param {object} options - Validation options
 * @returns {object} - Validation result with isValid and errors
 */
const validatePasswordComplexity = (password, options = {}) => {
  const config = { ...PASSWORD_REQUIREMENTS, ...options };
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password is required']
    };
  }

  // Length validation
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }

  if (password.length > config.maxLength) {
    errors.push(`Password must not exceed ${config.maxLength} characters`);
  }

  // Complexity requirements
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // Check against common passwords
  if (config.blacklistedPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  // Check for repeated characters (more than 3 consecutive)
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password cannot contain more than 3 consecutive identical characters');
  }

  // Check for sequential characters
  const sequentialPatterns = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    'qwertyuiopasdfghjklzxcvbnm'
  ];
  
  for (const pattern of sequentialPatterns) {
    for (let i = 0; i <= pattern.length - 4; i++) {
      const sequence = pattern.substring(i, i + 4);
      if (password.toLowerCase().includes(sequence)) {
        errors.push('Password cannot contain sequential characters (e.g., abcd, 1234)');
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength score
 * @param {string} password 
 * @returns {object} - Strength score and level
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  let feedback = [];

  // Length scoring
  if (password.length >= 8) score += 25;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score += 15;
  else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('Include uppercase letters');

  if (/\d/.test(password)) score += 15;
  else feedback.push('Include numbers');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
  else feedback.push('Include special characters');

  // Bonus points
  if (password.length >= 16) score += 10; // Very long passwords
  if (/[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 5; // Unicode characters

  // Determine strength level
  let level = 'Very Weak';
  let color = 'red';
  
  if (score >= 90) {
    level = 'Very Strong';
    color = 'green';
  } else if (score >= 70) {
    level = 'Strong';
    color = 'lightgreen';
  } else if (score >= 50) {
    level = 'Moderate';
    color = 'orange';
  } else if (score >= 30) {
    level = 'Weak';
    color = 'orange';
  }

  return {
    score: Math.min(score, 100),
    level,
    color,
    feedback: feedback.slice(0, 3) // Limit feedback to 3 most important items
  };
};

/**
 * Generate a secure password suggestion
 * @returns {string} - A secure password
 */
const generateSecurePassword = () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill remaining characters
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Express validator middleware for password complexity
 */
const passwordComplexityValidator = (fieldName = 'password', options = {}) => {
  return (req, res, next) => {
    const password = req.body[fieldName];
    const validation = validatePasswordComplexity(password, options);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet complexity requirements',
        errors: validation.errors
      });
    }
    
    next();
  };
};

module.exports = {
  validatePasswordComplexity,
  calculatePasswordStrength,
  generateSecurePassword,
  passwordComplexityValidator,
  PASSWORD_REQUIREMENTS
}; 