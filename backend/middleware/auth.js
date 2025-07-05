const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const DeliveryAgent = require('../models/DeliveryAgent');
const User = require('../models/User');

// Simple in-memory cache for frequently accessed users (production should use Redis)
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

// Cache utilities
const cacheUtils = {
  set: (key, value) => {
    if (userCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = userCache.keys().next().value;
      userCache.delete(firstKey);
    }
    userCache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  },
  
  get: (key) => {
    const cached = userCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    userCache.delete(key);
    return null;
  },
  
  clear: () => userCache.clear()
};

// Enhanced JWT verification with better error handling
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

// Enhanced user lookup with caching
const findUserById = async (id, userType) => {
  const cacheKey = `${userType}_${id}`;
  
  // Check cache first
  const cached = cacheUtils.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  let user = null;
  let selectFields = '';
  
  try {
    switch (userType) {
      case 'admin':
        selectFields = '-adminPassword';
        user = await Admin.findById(id).select(selectFields);
        break;
      case 'delivery_agent':
        selectFields = '-agentPassword';
        user = await DeliveryAgent.findById(id).select(selectFields);
        break;
      case 'customer':
        selectFields = '-password';
        user = await User.findById(id).select(selectFields);
        break;
      default:
        throw new Error('Invalid user type');
    }
    
    if (user) {
      cacheUtils.set(cacheKey, user);
    }
    
    return user;
  } catch (error) {
    console.error(`Error finding ${userType} by ID:`, error);
    return null;
  }
};

// Check user status and permissions
const validateUserStatus = (user, userType) => {
  switch (userType) {
    case 'admin':
      return user && user.status === 1;
    case 'delivery_agent':
      return user && user.status === 'active';
    case 'customer':
      return user && user.isActive;
    default:
      return false;
  }
};

// Generic authentication function - DRY principle
const createAuthMiddleware = (allowedUserTypes = [], options = {}) => {
  const { 
    optional = false,
    cacheable = true,
    requireActive = true 
  } = options;
  
  return async (req, res, next) => {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (optional) {
          return next();
        }
        return res.status(401).json({
          success: false,
          message: 'Access denied. No valid token provided.',
          code: 'NO_TOKEN'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify JWT token
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: error.message,
          code: error.message === 'Token expired' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
        });
      }

      // Check if user type is allowed
      if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(decoded.userType)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient privileges.',
          code: 'INSUFFICIENT_PRIVILEGES'
        });
      }

      // Find user with caching
      const user = cacheable 
        ? await findUserById(decoded.id, decoded.userType)
        : await findUserById(decoded.id, decoded.userType);

      if (!user) {
        // Clear cache for this user
        if (cacheable) {
          cacheUtils.clear();
        }
        return res.status(401).json({
          success: false,
          message: 'User not found or has been deactivated.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Validate user status
      if (requireActive && !validateUserStatus(user, decoded.userType)) {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive or suspended.',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      // Attach user info to request
      req.user = user;
      req.userType = decoded.userType;
      req.userId = decoded.id;
      
      // Add convenience flags
      req.isAdmin = decoded.userType === 'admin';
      req.isDeliveryAgent = decoded.userType === 'delivery_agent';
      req.isCustomer = decoded.userType === 'customer';

      next();
    } catch (error) {
      console.error('Authentication middleware error:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  };
};

// Specific middleware functions for backward compatibility and convenience
const authAdmin = createAuthMiddleware(['admin'], { cacheable: true });

const authDeliveryAgent = createAuthMiddleware(['delivery_agent'], { cacheable: true });

const authCustomer = createAuthMiddleware(['customer'], { cacheable: true });

// Generic auth for admin or delivery agent
const auth = createAuthMiddleware(['admin', 'delivery_agent'], { cacheable: true });

// Customer authentication (for backward compatibility)
const authenticateUser = authCustomer;

// Optional authentication - doesn't fail if no token
const optionalAuth = createAuthMiddleware([], { optional: true, cacheable: true });

// Multi-role authentication
const authAny = createAuthMiddleware(['admin', 'delivery_agent', 'customer'], { cacheable: true });

// Admin or Customer authentication (for certain shared endpoints)
const authAdminOrCustomer = createAuthMiddleware(['admin', 'customer'], { cacheable: true });

// Utility function to clear cache (useful for logout, user updates, etc.)
const clearAuthCache = () => {
  cacheUtils.clear();
  console.log('🗑️ Authentication cache cleared');
};

// Middleware to refresh user cache
const refreshUserCache = async (req, res, next) => {
  if (req.user && req.userType) {
    const cacheKey = `${req.userType}_${req.userId}`;
    cacheUtils.set(cacheKey, req.user);
  }
  next();
};

// Rate limiting for authentication failures
const authFailures = new Map();
const MAX_AUTH_FAILURES = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCKOUT_TIME = parseInt(process.env.LOCKOUT_TIME) * 60 * 1000 || 15 * 60 * 1000; // 15 minutes

const checkAuthRateLimit = (identifier) => {
  const now = Date.now();
  const failures = authFailures.get(identifier) || { count: 0, lastFailure: 0 };
  
  // Reset if lockout time has passed
  if (now - failures.lastFailure > LOCKOUT_TIME) {
    failures.count = 0;
  }
  
  if (failures.count >= MAX_AUTH_FAILURES) {
    const remainingTime = Math.ceil((LOCKOUT_TIME - (now - failures.lastFailure)) / 1000 / 60);
    throw new Error(`Too many failed attempts. Try again in ${remainingTime} minutes.`);
  }
  
  return failures;
};

const recordAuthFailure = (identifier) => {
  const failures = authFailures.get(identifier) || { count: 0, lastFailure: 0 };
  failures.count += 1;
  failures.lastFailure = Date.now();
  authFailures.set(identifier, failures);
};

const clearAuthFailures = (identifier) => {
  authFailures.delete(identifier);
};

module.exports = {
  // Main authentication middleware
  createAuthMiddleware,
  
  // Specific role middleware
  authAdmin,
  authDeliveryAgent,
  authCustomer,
  auth,
  authenticateUser, // Backward compatibility
  
  // Flexible middleware
  optionalAuth,
  authAny,
  authAdminOrCustomer,
  
  // Utility functions
  clearAuthCache,
  refreshUserCache,
  verifyToken,
  findUserById,
  validateUserStatus,
  
  // Rate limiting utilities
  checkAuthRateLimit,
  recordAuthFailure,
  clearAuthFailures,
  
  // Cache utilities for external use
  cacheUtils
}; 