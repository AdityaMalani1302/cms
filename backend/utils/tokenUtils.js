const logger = require('./logger');

/**
 * Validates and sanitizes JWT token format
 * @param {string} token - The JWT token to validate
 * @returns {Object} - { isValid: boolean, cleanToken: string|null, error: string|null }
 */
const validateAndCleanToken = (token) => {
  try {
    // Check if token exists and is a string
    if (!token || typeof token !== 'string') {
      return { 
        isValid: false, 
        cleanToken: null, 
        error: 'Token must be a non-empty string' 
      };
    }

    // Clean the token (remove extra whitespace)
    const cleanToken = token.trim();

    // Check if token is empty after trimming
    if (cleanToken === '') {
      return { 
        isValid: false, 
        cleanToken: null, 
        error: 'Token is empty after trimming' 
      };
    }

    // Validate JWT format (should have exactly 3 parts separated by dots)
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      return { 
        isValid: false, 
        cleanToken: null, 
        error: `Invalid JWT format: expected 3 parts, got ${parts.length}` 
      };
    }

    // Check that each part is not empty
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === '') {
        return { 
          isValid: false, 
          cleanToken: null, 
          error: `JWT part ${i + 1} is empty` 
        };
      }
    }

    // Validate Base64 format for header and payload (signature validation will be done by jwt.verify)
    try {
      // Validate header
      JSON.parse(Buffer.from(parts[0], 'base64').toString());
      // Validate payload  
      JSON.parse(Buffer.from(parts[1], 'base64').toString());
    } catch (error) {
      return { 
        isValid: false, 
        cleanToken: null, 
        error: 'Invalid Base64 encoding in JWT header or payload' 
      };
    }

    return { 
      isValid: true, 
      cleanToken, 
      error: null 
    };
  } catch (error) {
    logger.warn('Token validation error:', error);
    return { 
      isValid: false, 
      cleanToken: null, 
      error: 'Token validation failed' 
    };
  }
};

/**
 * Extracts token from Authorization header
 * @param {string} authHeader - The Authorization header value
 * @returns {Object} - { success: boolean, token: string|null, error: string|null }
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return { 
      success: false, 
      token: null, 
      error: 'Authorization header missing' 
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { 
      success: false, 
      token: null, 
      error: 'Authorization header must start with "Bearer "' 
    };
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  return { 
    success: true, 
    token: token, 
    error: null 
  };
};

/**
 * Comprehensive token validation pipeline
 * @param {string} authHeader - The Authorization header value
 * @returns {Object} - { isValid: boolean, token: string|null, error: string|null }
 */
const validateTokenFromHeader = (authHeader) => {
  // Extract token from header
  const extraction = extractTokenFromHeader(authHeader);
  if (!extraction.success) {
    return { 
      isValid: false, 
      token: null, 
      error: extraction.error 
    };
  }

  // Validate and clean the token
  const validation = validateAndCleanToken(extraction.token);
  return {
    isValid: validation.isValid,
    token: validation.cleanToken,
    error: validation.error
  };
};

module.exports = {
  validateAndCleanToken,
  extractTokenFromHeader,
  validateTokenFromHeader
};