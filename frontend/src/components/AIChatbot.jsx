import React, { useState, useEffect, useRef } from 'react';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [lastTrackingData, setLastTrackingData] = useState(null);
  const messagesEndRef = useRef(null);

  // Initialize chatbot session - now works for everyone
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen, sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async () => {
    try {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      
      // Add welcome message
      const welcomeMessage = {
        id: Date.now(),
        sender: 'bot',
        message: "👋 Welcome to CMS! I'm your virtual assistant. I can help you with:\n\n📦 Track packages (enter tracking ID like TRK490534820)\n💰 Get shipping cost estimates\n📍 Find our branch locations\n📞 Contact information\n💡 General courier questions\n\nHow can I help you today?",
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize chatbot session:', error);
    }
  };

  const processChatbotMessage = async (message, sessionId) => {
    const lowerCaseMessage = message.toLowerCase();

    // Greeting
    if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.includes('hey')) {
      return {
        message: "Hello! How can I assist you today? You can ask me to track a package, get a price quote, or find a branch.",
        quickReplies: ['Track package', 'Get price quote', 'Find branch'],
      };
    }

    // Menu
    if (lowerCaseMessage === 'menu' || lowerCaseMessage === 'start over') {
        return {
            message: "I can help you with:\n\n📦 Track packages (enter tracking ID like TRK490534820)\n💰 Get shipping cost estimates\n📍 Find our branch locations\n📞 Contact information\n💡 General courier questions\n\nHow can I help you today?",
            quickReplies: ['Track package', 'Get price quote', 'Find branch', 'Contact info'],
        };
    }

    // Tracking - Updated to match TRK format used in the system
    const trackingRegex = /TRK\d{9,12}/i;
    const trackingMatch = message.match(trackingRegex);
    if (trackingMatch || lowerCaseMessage.includes('track')) {
      const trackingId = trackingMatch ? trackingMatch[0] : message.split(' ').pop();
      if (trackingId && trackingId.toUpperCase().startsWith('TRK') && trackingId.length >= 12) {
        const data = await fetchRealTrackingData(trackingId);
        if (data && data.success) {
            if (data.booking) { // New booking model tracking
                const booking = data.booking;
                // Store tracking data for future queries
                setLastTrackingData({ trackingId, booking });
                
                const deliveryDateStr = booking.expectedDeliveryDate 
                  ? formatDate(booking.expectedDeliveryDate)
                  : 'Being calculated';
                
                let statusHistory = '';
                if (booking.statusHistory && booking.statusHistory.length > 0) {
                  statusHistory = '\n\n📋 Recent Updates:\n' + 
                    booking.statusHistory.slice(-3).map(h => 
                      `• ${formatDate(h.timestamp)}: ${h.status}`
                    ).join('\n');
                }
                
                return { 
                  message: `📦 Package ${trackingId}\n✅ Status: ${booking.status}\n📍 From: ${booking.pickupAddress.city}\n🎯 To: ${booking.deliveryAddress.city}\n🚚 Expected Delivery: ${deliveryDateStr}\n📦 Type: ${booking.packageType} (${booking.weight}kg)${statusHistory}\n\nNeed more details?`,
                  quickReplies: ['Delivery address', 'Contact recipient', 'File complaint', 'Main menu']
                };
            } else if (data.courier) { // Legacy tracking
                const { status, trackingHistory } = data.courier;
                let historyText = trackingHistory.map(h => `- ${formatDate(h.timestamp)}: ${h.status} at ${h.location}`).join('\n');
                return { message: `Tracking ID: ${trackingId}\nStatus: ${formatStatusText(status)}\n\nHistory:\n${historyText}` };
            }
        }
        return { message: `Sorry, I couldn't find any tracking information for ${trackingId}. Please check the ID and try again.` };
      }
      return { message: "Please provide a valid tracking ID in the format TRK followed by 9 digits (e.g., TRK490534820)." };
    }

    // Delivery Address
    if (lowerCaseMessage.includes('delivery address') || lowerCaseMessage === 'delivery address') {
      if (lastTrackingData && lastTrackingData.booking) {
        const address = lastTrackingData.booking.deliveryAddress;
        return {
          message: `📍 Delivery Address for ${lastTrackingData.trackingId}:\n\n🏠 ${address.street}\n🏢 ${address.city}, ${address.state}\n📮 ${address.pincode}\n🌍 ${address.country}\n\n👤 Recipient: ${lastTrackingData.booking.recipientName}\n📞 Contact: ${lastTrackingData.booking.recipientPhone}`,
          quickReplies: ['Track package', 'File complaint', 'Contact support', 'Main menu']
        };
      } else {
        return {
          message: "To view delivery address details, please first track a package by providing a tracking ID (e.g., TRK490534820).",
          quickReplies: ['Track package', 'Main menu']
        };
      }
    }

    // Costing
    const weightRegex = /(\d+(\.\d+)?)\s?kg/i;
    const weightMatch = lowerCaseMessage.match(weightRegex);
    if (weightMatch || lowerCaseMessage.includes('cost') || lowerCaseMessage.includes('price') || lowerCaseMessage.includes('quote')) {
        if (weightMatch) {
            const weight = parseFloat(weightMatch[1]);
            return await calculateRealCostForWeight(weight);
        }
        return { message: "Sure, I can give you a price quote. What is the weight of your package in kg? (e.g., '2.5kg')" };
    }

    // Branch locations
    if (lowerCaseMessage.includes('branch') || lowerCaseMessage.includes('location')) {
        const data = await fetchRealBranchData();
        if (data && data.success && data.branches.length > 0) {
            const branchList = data.branches.map(b => `- ${b.name}, ${b.city}`).join('\n');
            return { message: `Here are our branch locations:\n\n${branchList}` };
        }
        return { message: "I couldn't retrieve branch information right now. Please try again later." };
    }
    
    // Contact info
    if (lowerCaseMessage.includes('contact') || lowerCaseMessage.includes('phone') || lowerCaseMessage.includes('email')) {
        return {
            message: "You can reach our support team via:\n\n📞 Phone: 1800-267-4357\n📧 Email: support@cms.com\n🌐 Website: www.cms.com",
            quickReplies: ['Call now', 'Send email', 'Visit website'],
        };
    }

    // Default fallback
    return {
      message: "I'm not sure how to help with that. You can ask me to track a package, get a price quote, or find a branch.",
      quickReplies: ['Track package', 'Get price quote', 'Find branch'],
    };
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      message: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Use enhanced local processing (no backend dependency needed)
      const response = await processChatbotMessage(inputMessage.trim(), sessionId);
      
      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        message: response.message,
        timestamp: new Date(),
        quickReplies: response.quickReplies || null,
        data: response.data || null,
        intent: response.intent || 'local',
        confidence: response.confidence || 0.8
      };

      setTimeout(() => {
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 800); // Faster response time

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        message: "I'm sorry, I'm having trouble processing your request right now. Please try again or contact our support team.",
        timestamp: new Date()
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
      }, 1000);
    }
  };

  

  // Fetch real tracking data from API
  const fetchRealTrackingData = async (trackingId) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // Try the customer-tracking endpoint first (new system with Booking model)
      let response = await fetch(`${baseURL}/api/customer-tracking/${trackingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result;
        }
      }
      
      // Fallback to enhanced tracking endpoint
      response = await fetch(`${baseURL}/api/tracking/enhanced/${trackingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result;
        }
      }
      
      // Final fallback to legacy tracking endpoint
      response = await fetch(`${baseURL}/api/tracking/${trackingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      throw error;
    }
  };

  // Fetch real branch data from API
  const fetchRealBranchData = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      console.log('Fetching branch data from:', `${baseURL}/api/branches`);
      
      const response = await fetch(`${baseURL}/api/branches`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Branch API response status:', response.status);
      
      if (!response.ok) {
        console.log('Branch API failed with status:', response.status);
        return null;
      }
      
      const result = await response.json();
      console.log('Branch API result:', result);
      return result;
    } catch (error) {
      console.error('Error fetching branch data:', error);
      throw error;
    }
  };

  // Calculate real pricing using backend API
  const calculateRealCostForWeight = async (weight) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // Use bulk calculate endpoint for efficiency
      const response = await fetch(`${baseURL}/api/pricing/bulk-calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weight: weight
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.services) {
          const services = result.data.services;
          
          return {
            message: `💰 **Shipping costs for ${weight}kg package:**\n\n📦 **Standard (3 days):** ₹${services.Standard.cost}\n🚀 **Express (1 day):** ₹${services.Express.cost}\n⚡ **Same-day (4-6 hours):** ₹${services['Same-day'].cost}\n\n✨ *Live pricing from our system*\n💡 *Prices include base cost (₹50) + weight charges*\n\nReady to book a shipment?`,
            quickReplies: ['Book shipment', 'Different weight', 'Find branch', 'Main menu'],
            intent: 'cost_inquiry',
            confidence: 0.9
          };
        }
      }
      
      // If API call fails, fallback to local calculation
      throw new Error('API response not successful');
      
    } catch (error) {
      console.error('Pricing API error:', error);
      // Fallback to local calculation
      return calculateFallbackCostForWeight(weight);
    }
  };

  // Fallback pricing calculation when API is unavailable
  const calculateFallbackCost = (weight, serviceType) => {
    const baseCost = 50;
    const weightCostPerKg = 15;
    const multipliers = {
      'Standard': 1.0,
      'Express': 1.5,
      'Same-day': 2.0
    };
    
    const subtotal = baseCost + (weight * weightCostPerKg);
    return Math.round(subtotal * (multipliers[serviceType] || 1.0));
  };

  const calculateFallbackCostForWeight = (weight) => {
    const standardCost = calculateFallbackCost(weight, 'Standard');
    const expressCost = calculateFallbackCost(weight, 'Express');
    const samedayCost = calculateFallbackCost(weight, 'Same-day');
    
    return {
      message: `💰 **Shipping costs for ${weight}kg package:**\n\n📦 **Standard (3 days):** ₹${standardCost}\n🚀 **Express (1 day):** ₹${expressCost}\n⚡ **Same-day (4-6 hours):** ₹${samedayCost}\n\n⚠️ *Showing estimated prices (service temporarily unavailable)*\n\nNeed pricing for a different weight?`,
      quickReplies: ['Different weight', 'Book shipment', 'Find branch', 'Main menu'],
      intent: 'cost_inquiry',
      confidence: 0.7
    };
  };

  // Helper functions for tracking display
  const getStatusEmoji = (status) => {
    const statusMap = {
      'pending': '⏳',
      'confirmed': '✅',
      'picked_up': '📦',
      'in_transit': '🚛',
      'out_for_delivery': '🚚',
      'delivered': '✅',
      'cancelled': '❌',
      'delayed': '⏰'
    };
    return statusMap[status?.toLowerCase()] || '📦';
  };

  const formatStatusText = (status) => {
    const statusMap = {
      'pending': 'Pending Confirmation',
      'confirmed': 'Confirmed',
      'picked_up': 'Picked Up',
      'in_transit': 'In Transit',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'delayed': 'Delayed'
    };
    return statusMap[status?.toLowerCase()] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Not available';
    }
  };


  const handleQuickReply = (reply) => {
    // Handle navigation quick replies
    if (reply === 'Call now' || reply === 'Call branch') {
      window.open('tel:1800-267-4357');
      return;
    }
    if (reply === 'Send email') {
      window.open('mailto:support@cms.com');
      return;
    }
    if (reply === 'Visit website') {
      window.open('http://www.cms.com', '_blank');
      return;
    }
    if (reply === 'Contact for booking') {
      setInputMessage('contact');
      setTimeout(() => sendMessage(), 100);
      return;
    }
    if (reply === 'Main menu' || reply === 'Start over') {
      setInputMessage('menu');
      setTimeout(() => sendMessage(), 100);
      return;
    }
    
    // Handle specific quick reply actions
    if (reply === 'Book shipment') {
      const botMessage = {
        id: Date.now(),
        sender: 'bot',
        message: "📋 To book a shipment, please login to your customer account and use the 'Book Courier' feature.\n\n🔐 Login at: /customer/login\n📦 Then go to: Book Courier section\n\nThis will give you access to:\n• Real-time pricing\n• Pickup scheduling\n• Tracking information\n• Booking history",
        timestamp: new Date(),
        quickReplies: ['Track package', 'Get price quote', 'Contact support', 'Main menu']
      };
      setMessages(prev => [...prev, botMessage]);
      return;
    }
    
    if (reply === 'File complaint') {
      const botMessage = {
        id: Date.now(),
        sender: 'bot',
        message: "📝 To file a complaint, please login to your customer account and use the 'Raise Complaint' feature.\n\n🔐 Login at: /customer/login\n🔍 Then go to: Raise Complaint section\n\nYou can report:\n• Delayed delivery\n• Damaged package\n• Lost package\n• Wrong delivery\n• Service issues",
        timestamp: new Date(),
        quickReplies: ['Track package', 'Get price quote', 'Contact support', 'Main menu']
      };
      setMessages(prev => [...prev, botMessage]);
      return;
    }
    
    if (reply === 'Different weight') {
      const botMessage = {
        id: Date.now(),
        sender: 'bot',
        message: "💰 Please enter the weight of your package to get a price quote.\n\nFormat: Just type the weight with 'kg' (e.g., '2.5kg' or '1kg')\n\nOur weight limits: 0.1kg to 50kg",
        timestamp: new Date(),
        quickReplies: ['1kg', '2kg', '5kg', '10kg', 'Main menu']
      };
      setMessages(prev => [...prev, botMessage]);
      return;
    }
    
    if (reply === 'Find branch') {
      setInputMessage('branch');
      setTimeout(() => sendMessage(), 100);
      return;
    }
    
    if (reply === 'Delivery address') {
      setInputMessage('delivery address');
      setTimeout(() => sendMessage(), 100);
      return;
    }
    
    if (reply === 'Contact recipient') {
      if (lastTrackingData && lastTrackingData.booking) {
        const botMessage = {
          id: Date.now(),
          sender: 'bot',
          message: `📞 Recipient Contact Info for ${lastTrackingData.trackingId}:\n\n👤 Name: ${lastTrackingData.booking.recipientName}\n📱 Phone: ${lastTrackingData.booking.recipientPhone}\n\n💡 You can contact the recipient directly using this information.`,
          timestamp: new Date(),
          quickReplies: ['Track package', 'Delivery address', 'File complaint', 'Main menu']
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const botMessage = {
          id: Date.now(),
          sender: 'bot',
          message: "To view recipient contact information, please first track a package by providing a tracking ID (e.g., TRK490534820).",
          timestamp: new Date(),
          quickReplies: ['Track package', 'Main menu']
        };
        setMessages(prev => [...prev, botMessage]);
      }
      return;
    }
    
    if (reply === 'Get price quote') {
      const botMessage = {
        id: Date.now(),
        sender: 'bot',
        message: "💰 Please enter the weight of your package to get a price quote.\n\nFormat: Just type the weight with 'kg' (e.g., '2.5kg' or '1kg')\n\nOur weight limits: 0.1kg to 50kg",
        timestamp: new Date(),
        quickReplies: ['1kg', '2kg', '5kg', '10kg', 'Main menu']
      };
      setMessages(prev => [...prev, botMessage]);
      return;
    }
    
    // Handle weight quick replies
    if (reply.endsWith('kg') && ['1kg', '2kg', '5kg', '10kg'].includes(reply)) {
      setInputMessage(reply);
      setTimeout(() => sendMessage(), 100);
      return;
    }
    
    // Default behavior - send as message
    setInputMessage(reply);
    setTimeout(() => sendMessage(), 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  const closeChatbot = () => {
    setIsOpen(false);
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    if (isOpen) {
      initializeSession();
    }
  };

  // Show chatbot for everyone - no authentication required

  return (
    <>
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <button
          onClick={toggleChatbot}
          className="fixed bottom-6 right-6 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 transform hover:scale-105 z-50"
          aria-label="Open chatbot"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">CMS Assistant</h3>
                <p className="text-xs text-primary-100">Online</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearChat}
                className="text-primary-100 hover:text-white transition-colors"
                title="Clear chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={closeChatbot}
                className="text-primary-100 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.message}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  
                  {/* Quick Replies */}
                  {message.quickReplies && (
                    <div className="mt-3 space-y-1">
                      {message.quickReplies.map((reply, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickReply(reply)}
                          className="block w-full text-left text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-2 py-1 rounded hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isTyping}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;