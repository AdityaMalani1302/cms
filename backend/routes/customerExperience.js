const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');

const customerExperienceService = require('../services/customerExperienceService');

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

// FEATURE 2.4: CUSTOMER EXPERIENCE ENHANCEMENTS

// Multiple package booking
router.post('/bookings/multiple', [
  body('bookings').isArray({ min: 1, max: 10 }).withMessage('Bookings must be an array with 1-10 items'),
  body('bookings.*.senderName').notEmpty().withMessage('Sender name is required'),
  body('bookings.*.senderAddress').notEmpty().withMessage('Sender address is required'),
  body('bookings.*.senderPhone').isMobilePhone().withMessage('Valid sender phone is required'),
  body('bookings.*.recipientName').notEmpty().withMessage('Recipient name is required'),
  body('bookings.*.recipientAddress').notEmpty().withMessage('Recipient address is required'),
  body('bookings.*.recipientPhone').isMobilePhone().withMessage('Valid recipient phone is required'),
  body('bookings.*.packageType').notEmpty().withMessage('Package type is required'),
  body('bookings.*.weight').isFloat({ min: 0.1, max: 50 }).withMessage('Weight must be between 0.1 and 50 kg')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bookings, groupOptions } = req.body;
    const { userId } = req.user;

    const result = await customerExperienceService.createMultipleBookings(
      userId,
      bookings,
      groupOptions
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Multiple booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get available delivery slots
router.get('/delivery-slots', async (req, res) => {
  try {
    const { date, location } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const slots = await customerExperienceService.getAvailableDeliverySlots(date, location);

    res.json({
      success: true,
      data: {
        date,
        location,
        slots
      }
    });
  } catch (error) {
    console.error('Get delivery slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery slots'
    });
  }
});

// Get all delivery slots (static data)
router.get('/delivery-slots/all', (req, res) => {
  try {
    const slots = customerExperienceService.getDeliverySlots();

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    console.error('Get all delivery slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery slots'
    });
  }
});

// Modify existing booking
router.put('/bookings/:courierId/modify', [
  body('modifications').isObject().withMessage('Modifications must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { courierId } = req.params;
    const { modifications } = req.body;
    const { userId } = req.user;

    const result = await customerExperienceService.modifyBooking(
      userId,
      courierId,
      modifications
    );

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Modify booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Cancel booking
router.post('/bookings/:courierId/cancel', [
  body('reason').notEmpty().withMessage('Cancellation reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { courierId } = req.params;
    const { reason } = req.body;
    const { userId } = req.user;

    const result = await customerExperienceService.cancelBooking(
      userId,
      courierId,
      reason
    );

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});



// Get delivery priority options
router.get('/priority/options', (req, res) => {
  try {
    const options = customerExperienceService.getPriorityOptions();

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Get priority options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get priority options'
    });
  }
});

// Calculate booking cost
router.post('/bookings/calculate-cost', [
  body('bookingData').isObject().withMessage('Booking data is required'),
  body('bookingData.weight').isFloat({ min: 0.1, max: 50 }).withMessage('Weight must be between 0.1 and 50 kg'),
  body('bookingData.packageType').notEmpty().withMessage('Package type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bookingData } = req.body;

    const costCalculation = await customerExperienceService.calculateBookingCost(bookingData);

    res.json({
      success: true,
      data: costCalculation
    });
  } catch (error) {
    console.error('Calculate cost error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Customer support - initiate chat/ticket
router.post('/support/initiate', [
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level'),
  body('courierId').optional().isMongoId().withMessage('Invalid courier ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { subject, message, priority, courierId } = req.body;
    const { userId } = req.user;

    const result = await customerExperienceService.initiateCustomerSupport(
      userId,
      courierId,
      subject,
      message,
      priority
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Initiate support error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get customer preferences
router.get('/preferences', async (req, res) => {
  try {
    const { userId } = req.user;

    const preferences = await customerExperienceService.getCustomerPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer preferences'
    });
  }
});

// Update customer preferences
router.put('/preferences', [
  body('preferences').isObject().withMessage('Preferences must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { preferences } = req.body;
    const { userId } = req.user;

    const result = await customerExperienceService.updateCustomerPreferences(userId, preferences);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get customer address book
router.get('/address-book', async (req, res) => {
  try {
    const { userId } = req.user;

    const addressBook = await customerExperienceService.getCustomerAddressBook(userId);

    res.json({
      success: true,
      data: addressBook
    });
  } catch (error) {
    console.error('Get address book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address book'
    });
  }
});

// Add address to address book
router.post('/address-book', [
  body('label').notEmpty().withMessage('Address label is required'),
  body('name').notEmpty().withMessage('Contact name is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('pincode').isPostalCode('IN').withMessage('Valid pincode is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const address = req.body;
    const { userId } = req.user;

    const result = await customerExperienceService.addToAddressBook(userId, address);

    res.status(201).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Validate booking data
router.post('/bookings/validate', [
  body('bookingData').isObject().withMessage('Booking data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bookingData } = req.body;

    const validation = await customerExperienceService.validateBookingData(bookingData);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Validate booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get booking cost breakdown
router.post('/bookings/cost-breakdown', [
  body('bookingData').isObject().withMessage('Booking data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bookingData } = req.body;

    const costCalculation = await customerExperienceService.calculateBookingCost(bookingData);

    res.json({
      success: true,
      data: {
        totalCost: costCalculation.totalCost,
        breakdown: costCalculation.breakdown,
        baseCost: await customerExperienceService.calculateBaseCost(bookingData)
      }
    });
  } catch (error) {
    console.error('Cost breakdown error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get booking options summary (for frontend display)
router.get('/booking-options', (req, res) => {
  try {
    const options = {
      deliverySlots: customerExperienceService.getDeliverySlots(),
  
      priorityOptions: customerExperienceService.getPriorityOptions(),
      additionalServices: [
        {
          id: 'fragileHandling',
          name: 'Fragile Handling',
          description: 'Special care for fragile items',
          cost: 50
        },
        {
          id: 'signatureRequired',
          name: 'Signature Required',
          description: 'Recipient signature required for delivery',
          cost: 25
        },
        {
          id: 'packagePhotos',
          name: 'Package Photos',
          description: 'Photos of package condition during transit',
          cost: 30
        }
      ],
      packageTypes: [
        'Documents',
        'Electronics',
        'Clothing',
        'Books',
        'Food Items',
        'Fragile Items',
        'Medical Supplies',
        'Gifts',
        'Others'
      ],
      maxWeight: 50,
      minWeight: 0.1,
      maxDimensions: {
        length: 100,
        width: 100,
        height: 100
      }
    };

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Get booking options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking options'
    });
  }
});

// Check delivery availability for location
router.get('/delivery-availability', [
  body('city').optional().notEmpty().withMessage('City is required'),
  body('pincode').optional().isPostalCode('IN').withMessage('Valid pincode is required')
], async (req, res) => {
  try {
    const { city, pincode } = req.query;

    if (!city && !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Either city or pincode is required'
      });
    }

    // Simplified availability check - in real implementation, 
    // you would check against your service areas
    const isAvailable = true;
    const estimatedDays = Math.floor(Math.random() * 3) + 1; // 1-3 days

    res.json({
      success: true,
      data: {
        available: isAvailable,
        estimatedDeliveryDays: estimatedDays,
        serviceLevel: isAvailable ? 'standard' : 'not_available',
        nextDayDelivery: isAvailable && estimatedDays === 1,
        sameDayDelivery: false, // Could be implemented based on location
        message: isAvailable 
          ? `Delivery available in ${estimatedDays} day(s)`
          : 'Delivery not available in this area'
      }
    });
  } catch (error) {
    console.error('Check delivery availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check delivery availability'
    });
  }
});

module.exports = router;