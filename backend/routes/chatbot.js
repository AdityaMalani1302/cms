const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authCustomer, authAdmin, optionalAuth } = require('../middleware/auth');
const { getPricingDisplay, calculateShippingCost } = require('../utils/pricingUtils');

// Chatbot service configuration (Python service - optional)
const CHATBOT_SERVICE_URL = process.env.CHATBOT_SERVICE_URL || 'http://localhost:8000';
const USE_PYTHON_SERVICE = process.env.USE_PYTHON_SERVICE === 'true';

/**
 * @route   POST /api/chatbot/message
 * @desc    Process chatbot message and return response
 * @access  Public (No authentication required)
 */
router.post('/message', [
  // No authentication required - public access
  // Input validation
  body('message').isLength({ min: 1, max: 1000 }).trim().escape(),
  body('sessionId').optional().isLength({ min: 1, max: 100 }).trim(),
  body('userId').optional().isMongoId()
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

    const { message, sessionId, userId } = req.body;

    // Prepare request for Python chatbot service
    const chatbotRequest = {
      message: message,
      sessionId: sessionId || `session_${Date.now()}`,
      userId: userId || null,
      timestamp: new Date().toISOString(),
      context: {
        isAuthenticated: !!req.user,
        userRole: req.user?.role || 'guest'
      }
    };

    // Try Python chatbot service if enabled, otherwise use fallback
    if (USE_PYTHON_SERVICE) {
      try {
        const axios = require('axios');
        const response = await axios.post(`${CHATBOT_SERVICE_URL}/api/process`, chatbotRequest, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Return chatbot response
        return res.json({
          success: true,
          data: {
            message: response.data.message,
            intent: response.data.intent,
            entities: response.data.entities,
            quickReplies: response.data.quickReplies,
            sessionId: response.data.sessionId,
            confidence: response.data.confidence,
            timestamp: new Date().toISOString()
          }
        });

      } catch (chatbotError) {
        console.log('Python service unavailable, using fallback mode');
      }
    }
    
    // Use built-in fallback response system
    const fallbackResponse = await generateFallbackResponse(message, req);
    
    res.json({
      success: true,
      data: {
        message: fallbackResponse.message,
        intent: fallbackResponse.intent || 'fallback',
        entities: fallbackResponse.entities || {},
        quickReplies: fallbackResponse.quickReplies,
        sessionId: sessionId || `session_${Date.now()}`,
        confidence: fallbackResponse.confidence || 0.7,
        timestamp: new Date().toISOString(),
        mode: 'builtin'
      }
    });

  } catch (error) {
    console.error('Chatbot message processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chatbot message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/chatbot/session/:sessionId
 * @desc    Get conversation history for a session
 * @access  Private (Customer only)
 */
router.get('/session/:sessionId', authCustomer, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Call Python chatbot service to get session history
    const response = await axios.get(`${CHATBOT_SERVICE_URL}/api/session/${sessionId}`, {
      timeout: 5000
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session history'
    });
  }
});

/**
 * @route   POST /api/chatbot/session/reset
 * @desc    Clear conversation context for a session
 * @access  Private (Customer only)
 */
router.post('/session/reset', [
  authCustomer, // Require customer authentication
  body('sessionId').isLength({ min: 1, max: 100 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
        errors: errors.array()
      });
    }

    const { sessionId } = req.body;

    // Call Python chatbot service to reset session
    await axios.post(`${CHATBOT_SERVICE_URL}/api/session/reset`, { sessionId }, {
      timeout: 5000
    });

    res.json({
      success: true,
      message: 'Session reset successfully'
    });

  } catch (error) {
    console.error('Session reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset session'
    });
  }
});

/**
 * @route   GET /api/chatbot/health
 * @desc    Health check for chatbot service
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    // Check if Python chatbot service is running
    const response = await axios.get(`${CHATBOT_SERVICE_URL}/health`, {
      timeout: 3000
    });

    res.json({
      success: true,
      message: 'Chatbot service is healthy',
      pythonService: {
        status: 'online',
        response: response.data
      }
    });

  } catch (error) {
    res.json({
      success: true,
      message: 'Chatbot API is running',
      pythonService: {
        status: 'offline',
        error: error.message
      },
      fallbackMode: true
    });
  }
});

/**
 * Enhanced fallback response generator with CMS API integration
 */
async function generateFallbackResponse(message, req) {
  const lowerMessage = message.toLowerCase();

  // Package tracking with actual API integration - Updated for TRK format
  if (lowerMessage.includes('track') || /TRK\d{9,12}/i.test(message)) {
    const trackingMatch = message.match(/TRK\d{9,12}/i);
    if (trackingMatch) {
      try {
        const trackingId = trackingMatch[0].toUpperCase();
        // Try to get actual tracking data
        const trackingData = await getTrackingData(trackingId, req);
        
        if (trackingData && trackingData.success) {
          // Handle new booking model response
          if (trackingData.booking) {
            const booking = trackingData.booking;
            const deliveryDateStr = booking.expectedDeliveryDate 
              ? new Date(booking.expectedDeliveryDate).toLocaleDateString()
              : 'Being calculated';
            
            let statusHistory = '';
            if (booking.statusHistory && booking.statusHistory.length > 0) {
              statusHistory = '\n\n📋 Recent Updates:\n' + 
                booking.statusHistory.slice(-3).map(h => 
                  `• ${new Date(h.timestamp).toLocaleDateString()}: ${h.status}`
                ).join('\n');
            }
            
            return {
              message: `📦 Package ${trackingId}\n✅ Status: ${booking.status}\n📍 From: ${booking.pickupAddress.city}\n🎯 To: ${booking.deliveryAddress.city}\n🚚 Expected Delivery: ${deliveryDateStr}\n📦 Type: ${booking.packageType} (${booking.weight}kg)${statusHistory}\n\nNeed more details?`,
              quickReplies: ['Delivery address', 'File complaint', 'Find branch', 'Main menu'],
              intent: 'track_package',
              confidence: 0.95,
              entities: { tracking_number: trackingId, booking: booking }
            };
          }
          
          // Fallback for legacy data format
          return {
            message: `📦 Package ${trackingId} Status: ${trackingData.data?.status || trackingData.status}\n📍 Current Location: ${trackingData.data?.currentLocation || 'Processing'}\n🚚 Expected Delivery: ${trackingData.data?.estimatedDelivery || 'Being calculated'}\n\nWould you like more details?`,
            quickReplies: ['Show full tracking', 'Get delivery updates', 'Contact support'],
            intent: 'track_package',
            confidence: 0.9,
            entities: { tracking_number: trackingId }
          };
        } else {
          return {
            message: `❌ Sorry, I couldn't find package ${trackingId}. Please check the tracking number and try again.\n\nNeed help? I can:\n• Help you find your correct tracking number\n• Connect you with customer support`,
            quickReplies: ['Contact support', 'Try different number', 'File complaint'],
            intent: 'track_package',
            confidence: 0.8
          };
        }
      } catch (error) {
        console.error('Tracking API error:', error);
      }
    }
    
    return {
      message: "I'll help you track your package. Please provide your tracking number in the format TRK followed by 9 digits (example: TRK490534820).",
      quickReplies: ['I have tracking number', 'Lost tracking number', 'Contact support'],
      intent: 'track_package',
      confidence: 0.7
    };
  }
  
  // Delivery Address
  if (lowerMessage.includes('delivery address') || lowerMessage === 'delivery address') {
    return {
      message: "To view delivery address details, please first track a package by providing your tracking ID.\n\nExample: TRK490534820",
      quickReplies: ['Track package', 'Main menu'],
      intent: 'delivery_address',
      confidence: 0.8
    };
  }

  // Complaint filing with actual form data
  if (lowerMessage.includes('complaint') || lowerMessage.includes('complain') || lowerMessage.includes('issue') || lowerMessage.includes('problem') || lowerMessage === 'file complaint') {
    return {
      message: "📝 To file a complaint, please login to your customer account and use the 'Raise Complaint' feature.\n\n🔐 Login at: /customer/login\n🔍 Then go to: Raise Complaint section\n\nYou can report:\n• Delayed delivery\n• Damaged package\n• Lost package\n• Wrong delivery\n• Service issues",
      quickReplies: ['Track package', 'Get price quote', 'Contact support', 'Main menu'],
      intent: 'file_complaint',
      confidence: 0.9
    };
  }

  // Cost estimation with actual pricing
  if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('shipping') || lowerMessage.includes('estimate')) {
    // Extract weight if mentioned
    const weightMatch = message.match(/(\d+(?:\.\d+)?)\s*(kg|kilogram|grams?|g)/i);
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      let standardCost, expressCost, samedayCost;
      
      try {
        standardCost = calculateShippingCost(weight, 'Standard');
        expressCost = calculateShippingCost(weight, 'Express');
        samedayCost = calculateShippingCost(weight, 'Same-day');
      } catch (error) {
        return {
          message: `❌ Sorry, I couldn't calculate costs for ${weight}kg. Please ensure the weight is between 0.1kg and 50kg.`,
          quickReplies: ['Different weight', 'Contact support'],
          intent: 'error',
          confidence: 0.9
        };
      }
      
      return {
        message: `💰 Shipping costs for ${weight}kg package:\n\n📦 Standard (3 days): ₹${standardCost}\n🚀 Express (1 day): ₹${expressCost}\n⚡ Same-day: ₹${samedayCost}\n\nWould you like to book a courier?`,
        quickReplies: ['Book shipment', 'Different weight', 'Find branch', 'Main menu'],
        intent: 'cost_inquiry',
        confidence: 0.9,
        entities: { weight: weight }
      };
    }
    
    return {
      message: `I'll help you estimate shipping costs. Our pricing:\n\n📦 ${getPricingDisplay().replace(/\n/g, '\n🚀 ').replace('🚀 Standard', '📦 Standard').replace('🚀 Express', '🚀 Express').replace('🚀 Same-day', '⚡ Same-day')}\n\nWhat's your package weight?`,
      quickReplies: ['Under 1kg', '1-5kg', '5-10kg', 'Over 10kg'],
      intent: 'cost_inquiry',
      confidence: 0.8
    };
  }

  // Book shipment
  if (lowerMessage.includes('book shipment') || lowerMessage === 'book shipment' || lowerMessage.includes('book courier')) {
    return {
      message: "📋 To book a shipment, please login to your customer account and use the 'Book Courier' feature.\n\n🔐 Login at: /customer/login\n📦 Then go to: Book Courier section\n\nThis will give you access to:\n• Real-time pricing\n• Pickup scheduling\n• Tracking information\n• Booking history",
      quickReplies: ['Track package', 'Get price quote', 'Contact support', 'Main menu'],
      intent: 'book_shipment',
      confidence: 0.9
    };
  }

  // Different weight
  if (lowerMessage.includes('different weight') || lowerMessage === 'different weight') {
    return {
      message: "💰 Please enter the weight of your package to get a price quote.\n\nFormat: Just type the weight with 'kg' (e.g., '2.5kg' or '1kg')\n\nOur weight limits: 0.1kg to 50kg",
      quickReplies: ['1kg', '2kg', '5kg', '10kg', 'Main menu'],
      intent: 'weight_inquiry',
      confidence: 0.9
    };
  }

  // Support contact
  if (lowerMessage.includes('support') || lowerMessage.includes('help') || lowerMessage.includes('contact') || lowerMessage.includes('agent')) {
    return {
      message: "I can connect you with our support team:\n\n📞 Phone: 1800-XXX-XXXX (9 AM - 9 PM)\n📧 Email: support@cms.com\n💬 Live Chat: Available (9 AM - 6 PM)\n\nOr I can help you create a support ticket.",
      quickReplies: ['Create support ticket', 'Call now', 'Send email', 'Live chat'],
      intent: 'support_contact',
      confidence: 0.8
    };
  }

  // Location updates
  if (lowerMessage.includes('location') || lowerMessage.includes('where') || lowerMessage.includes('status') || lowerMessage.includes('update')) {
    return {
      message: "To check your package location, I'll need your tracking number. Please provide your tracking ID in the format TRK followed by 9 digits.\n\nExample: TRK490534820",
      quickReplies: ['I have tracking number', 'Lost tracking number', 'Contact support'],
      intent: 'location_update',
      confidence: 0.7
    };
  }

  // Greetings
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('good morning') || lowerMessage.includes('good evening')) {
    return {
      message: "Hello! 👋 I'm your CMS assistant. I can help you with:\n\n📦 Track packages (enter tracking ID like TRK490534820)\n💰 Get shipping cost estimates\n📍 Find our branch locations\n📞 Contact information\n💡 General courier questions\n\nHow can I assist you today?",
      quickReplies: ['Track package', 'Get price quote', 'Find branch', 'Contact support'],
      intent: 'greeting',
      confidence: 0.9
    };
  }

  // Goodbye
  if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
    return {
      message: "Thank you for using CMS! 😊 Have a great day! Feel free to chat with me anytime you need assistance.",
      quickReplies: ['Track another package', 'New inquiry'],
      intent: 'goodbye',
      confidence: 0.9
    };
  }

  // Default fallback
  return {
    message: "I'm not sure I understood that. Here are some things I can help with:\n\n• Type a tracking number to track your package\n• Say 'file complaint' to report an issue\n• Ask 'shipping cost' for pricing information\n• Type 'support' to contact our team",
    quickReplies: ['Track package', 'File complaint', 'Get pricing', 'Contact support'],
    intent: 'unknown',
    confidence: 0.5
  };
}

/**
 * Get tracking data from CMS API
 */
async function getTrackingData(trackingId, req) {
  try {
    const baseURL = process.env.API_BASE_URL || 'http://localhost:5000';
    const axios = require('axios');
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Only add Authorization header if it exists
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }
    
    // Try customer-tracking endpoint first (new system with Booking model)
    try {
      const response = await axios.get(`${baseURL}/api/customer-tracking/${trackingId}`, {
        headers: headers,
        timeout: 5000
      });
      
      if (response.data && response.data.success) {
        return response.data;
      }
    } catch (err) {
      console.log('Customer tracking API not available, trying enhanced tracking');
    }
    
    // Fallback to enhanced tracking endpoint
    try {
      const response = await axios.get(`${baseURL}/api/tracking/enhanced/${trackingId}`, {
        headers: headers,
        timeout: 5000
      });
      
      if (response.data && response.data.success) {
        return response.data;
      }
    } catch (err) {
      console.log('Enhanced tracking API not available, trying basic tracking');
    }
    
    // Final fallback to basic tracking endpoint
    const response = await axios.get(`${baseURL}/api/tracking/${trackingId}`, {
      headers: headers,
      timeout: 5000
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching tracking data:', error.message);
    return null;
  }
}

module.exports = router;