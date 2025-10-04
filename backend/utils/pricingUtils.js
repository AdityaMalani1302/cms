/**
 * Centralized Pricing Utility
 * Single source of truth for all pricing calculations across the CMS
 */

// Pricing Configuration
const PRICING_CONFIG = {
  baseCost: 50, // Base cost in rupees
  weightCostPerKg: 15, // Cost per kg in rupees
  
  // Service types with their multipliers and delivery times
  serviceTypes: {
    'Standard': {
      multiplier: 1.0,
      deliveryDays: 3,
      displayName: 'Standard (3 days)',
      description: '3-day delivery'
    },
    'Express': {
      multiplier: 1.5,
      deliveryDays: 1,
      displayName: 'Express (1 day)',
      description: '1-day delivery'
    },
    'Same-day': {
      multiplier: 2.0,
      deliveryDays: 0,
      displayName: 'Same-day',
      description: 'Same-day delivery'
    }
  },
  
  // Weight limits
  minWeight: 0.1,
  maxWeight: 50
};

/**
 * Calculate shipping cost based on weight and service type
 * @param {number} weight - Package weight in kg
 * @param {string} serviceType - Service type (Standard, Express, Same-day)
 * @returns {number} - Calculated cost in rupees (rounded)
 */
const calculateShippingCost = (weight, serviceType) => {
  // Validate inputs
  if (!weight || weight <= 0 || weight > PRICING_CONFIG.maxWeight) {
    throw new Error(`Invalid weight: must be between ${PRICING_CONFIG.minWeight} and ${PRICING_CONFIG.maxWeight} kg`);
  }
  
  if (!serviceType || !PRICING_CONFIG.serviceTypes[serviceType]) {
    throw new Error(`Invalid service type. Valid types: ${Object.keys(PRICING_CONFIG.serviceTypes).join(', ')}`);
  }
  
  const weightFloat = parseFloat(weight);
  const serviceConfig = PRICING_CONFIG.serviceTypes[serviceType];
  
  // Calculate: (Base Cost + Weight Cost) × Service Multiplier
  const baseCost = PRICING_CONFIG.baseCost;
  const weightCost = weightFloat * PRICING_CONFIG.weightCostPerKg;
  const totalCost = (baseCost + weightCost) * serviceConfig.multiplier;
  
  return Math.round(totalCost);
};

/**
 * Calculate expected delivery date
 * @param {string} serviceType - Service type
 * @param {Date|string} pickupDate - Pickup date
 * @returns {Date} - Expected delivery date
 */
const calculateExpectedDelivery = (serviceType, pickupDate) => {
  if (!PRICING_CONFIG.serviceTypes[serviceType]) {
    throw new Error(`Invalid service type: ${serviceType}`);
  }
  
  const pickup = new Date(pickupDate);
  const deliveryDays = PRICING_CONFIG.serviceTypes[serviceType].deliveryDays;
  const expectedDelivery = new Date(pickup);
  expectedDelivery.setDate(pickup.getDate() + deliveryDays);
  
  return expectedDelivery;
};

/**
 * Get pricing breakdown for display
 * @param {number} weight - Package weight in kg
 * @param {string} serviceType - Service type
 * @returns {object} - Pricing breakdown object
 */
const getPricingBreakdown = (weight, serviceType) => {
  if (!PRICING_CONFIG.serviceTypes[serviceType]) {
    throw new Error(`Invalid service type: ${serviceType}`);
  }
  
  const weightFloat = parseFloat(weight);
  const serviceConfig = PRICING_CONFIG.serviceTypes[serviceType];
  
  const baseCost = PRICING_CONFIG.baseCost;
  const weightCost = weightFloat * PRICING_CONFIG.weightCostPerKg;
  const subtotal = baseCost + weightCost;
  const multiplier = serviceConfig.multiplier;
  const total = Math.round(subtotal * multiplier);
  
  return {
    baseCost,
    weightCost,
    subtotal,
    multiplier,
    total,
    serviceType,
    weight: weightFloat,
    deliveryDays: serviceConfig.deliveryDays
  };
};

/**
 * Get all available service types with pricing info
 * @param {number} weight - Package weight in kg (optional, for cost calculation)
 * @returns {array} - Array of service type objects
 */
const getAvailableServiceTypes = (weight = null) => {
  return Object.entries(PRICING_CONFIG.serviceTypes).map(([key, config]) => {
    const serviceInfo = {
      value: key,
      displayName: config.displayName,
      description: config.description,
      deliveryDays: config.deliveryDays,
      multiplier: config.multiplier
    };
    
    if (weight) {
      serviceInfo.estimatedCost = calculateShippingCost(weight, key);
      serviceInfo.costPerKg = Math.round((PRICING_CONFIG.baseCost + PRICING_CONFIG.weightCostPerKg) * config.multiplier);
    }
    
    return serviceInfo;
  });
};

/**
 * Get simplified pricing display for chatbot/help
 * @returns {string} - Formatted pricing string
 */
const getPricingDisplay = () => {
  const lines = Object.entries(PRICING_CONFIG.serviceTypes).map(([key, config]) => {
    const effectiveCostPerKg = PRICING_CONFIG.weightCostPerKg * config.multiplier;
    return `${config.displayName}: ₹${PRICING_CONFIG.baseCost} base + ₹${effectiveCostPerKg}/kg`;
  });
  
  return lines.join('\n');
};

/**
 * Validate weight input
 * @param {number} weight - Weight to validate
 * @returns {boolean} - True if valid
 */
const isValidWeight = (weight) => {
  const weightFloat = parseFloat(weight);
  return !isNaN(weightFloat) && 
         weightFloat >= PRICING_CONFIG.minWeight && 
         weightFloat <= PRICING_CONFIG.maxWeight;
};

/**
 * Validate service type
 * @param {string} serviceType - Service type to validate
 * @returns {boolean} - True if valid
 */
const isValidServiceType = (serviceType) => {
  return serviceType && PRICING_CONFIG.serviceTypes.hasOwnProperty(serviceType);
};

module.exports = {
  // Main functions
  calculateShippingCost,
  calculateExpectedDelivery,
  getPricingBreakdown,
  getAvailableServiceTypes,
  getPricingDisplay,
  
  // Validation functions
  isValidWeight,
  isValidServiceType,
  
  // Configuration access
  PRICING_CONFIG,
  
  // Legacy support (for backward compatibility)
  calculateCost: calculateShippingCost // Alias for existing code
};