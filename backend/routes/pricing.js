const express = require('express');
const { body, validationResult } = require('express-validator');
const { calculateShippingCost, getPricingBreakdown, getAvailableServiceTypes, isValidWeight, isValidServiceType } = require('../utils/pricingUtils');

const router = express.Router();

/**
 * @route   POST /api/pricing/calculate
 * @desc    Calculate shipping cost for given weight and service type
 * @access  Public
 */
router.post('/calculate', [
  body('weight').isFloat({ min: 0.1, max: 50 }).withMessage('Weight must be between 0.1 and 50 kg'),
  body('serviceType').isIn(['Standard', 'Express', 'Same-day']).withMessage('Invalid service type')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { weight, serviceType } = req.body;

    // Calculate cost using the pricing utility
    const cost = calculateShippingCost(weight, serviceType);
    const breakdown = getPricingBreakdown(weight, serviceType);

    res.json({
      success: true,
      data: {
        weight: parseFloat(weight),
        serviceType,
        cost,
        total: cost,
        breakdown,
        estimatedDelivery: breakdown.deliveryDays === 0 ? 'Same day' : `${breakdown.deliveryDays} day${breakdown.deliveryDays > 1 ? 's' : ''}`
      }
    });

  } catch (error) {
    console.error('Pricing calculation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate shipping cost',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/pricing/bulk-calculate
 * @desc    Calculate shipping costs for all service types
 * @access  Public
 */
router.post('/bulk-calculate', [
  body('weight').isFloat({ min: 0.1, max: 50 }).withMessage('Weight must be between 0.1 and 50 kg')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { weight } = req.body;
    const serviceTypes = ['Standard', 'Express', 'Same-day'];
    const results = {};

    // Calculate for all service types
    for (const serviceType of serviceTypes) {
      try {
        const cost = calculateShippingCost(weight, serviceType);
        const breakdown = getPricingBreakdown(weight, serviceType);
        
        results[serviceType] = {
          cost,
          breakdown,
          estimatedDelivery: breakdown.deliveryDays === 0 ? 'Same day' : `${breakdown.deliveryDays} day${breakdown.deliveryDays > 1 ? 's' : ''}`
        };
      } catch (serviceError) {
        console.error(`Error calculating ${serviceType} cost:`, serviceError);
        results[serviceType] = {
          error: serviceError.message
        };
      }
    }

    res.json({
      success: true,
      data: {
        weight: parseFloat(weight),
        services: results
      }
    });

  } catch (error) {
    console.error('Bulk pricing calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate shipping costs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/pricing/services
 * @desc    Get all available service types with pricing info
 * @access  Public
 */
router.get('/services', async (req, res) => {
  try {
    const { weight } = req.query;
    let services;

    if (weight && isValidWeight(weight)) {
      services = getAvailableServiceTypes(parseFloat(weight));
    } else {
      services = getAvailableServiceTypes();
    }

    res.json({
      success: true,
      data: {
        services,
        weightProvided: !!weight,
        weight: weight ? parseFloat(weight) : null
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service types',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/pricing/info
 * @desc    Get general pricing information
 * @access  Public
 */
router.get('/info', async (req, res) => {
  try {
    const { getPricingDisplay, PRICING_CONFIG } = require('../utils/pricingUtils');
    
    res.json({
      success: true,
      data: {
        baseCost: PRICING_CONFIG.baseCost,
        costPerKg: PRICING_CONFIG.weightCostPerKg,
        minWeight: PRICING_CONFIG.minWeight,
        maxWeight: PRICING_CONFIG.maxWeight,
        serviceTypes: PRICING_CONFIG.serviceTypes,
        pricingDisplay: getPricingDisplay()
      }
    });

  } catch (error) {
    console.error('Get pricing info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pricing information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/pricing/validate
 * @desc    Validate weight and service type combination
 * @access  Public
 */
router.post('/validate', [
  body('weight').optional().isFloat({ min: 0.1, max: 50 }),
  body('serviceType').optional().isIn(['Standard', 'Express', 'Same-day'])
], async (req, res) => {
  try {
    const { weight, serviceType } = req.body;
    const validation = {
      weight: {
        provided: !!weight,
        valid: weight ? isValidWeight(weight) : null,
        value: weight ? parseFloat(weight) : null
      },
      serviceType: {
        provided: !!serviceType,
        valid: serviceType ? isValidServiceType(serviceType) : null,
        value: serviceType || null
      }
    };

    const isValidCombination = validation.weight.valid && validation.serviceType.valid;

    res.json({
      success: true,
      data: {
        validation,
        isValidCombination,
        canCalculateCost: isValidCombination
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate pricing parameters',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;