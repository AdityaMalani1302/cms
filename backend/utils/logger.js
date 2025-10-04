// Simple logger for college project
const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data);
  },
  
  error: (message, data = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, data);
  },
  
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data);
  },
  
  debug: (message, data = {}) => {
    console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, data);
  },

  // Additional methods used in server.js
  security: (message, data = {}) => {
    console.warn(`[SECURITY] ${new Date().toISOString()}: ${message}`, data);
  },

  request: (method, url, statusCode, duration) => {
    console.log(`[REQUEST] ${new Date().toISOString()}: ${method} ${url} - ${statusCode} (${duration}ms)`);
  },

  performance: (metric, value, threshold) => {
    if (value > threshold) {
      console.warn(`[PERFORMANCE] ${new Date().toISOString()}: ${metric} - ${value}ms (threshold: ${threshold}ms)`);
    }
  },

  database: (message, data = {}) => {
    console.log(`[DATABASE] ${new Date().toISOString()}: ${message}`, data);
  },

  success: (message, data = {}) => {
    console.log(`[SUCCESS] ${new Date().toISOString()}: ${message}`, data);
  },

  startup: (service, message, data = {}) => {
    console.log(`[STARTUP] ${new Date().toISOString()}: ${service} - ${message}`, data);
  }
};

module.exports = logger;