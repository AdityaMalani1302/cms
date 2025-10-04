import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const Support = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('contact');
  const [contactForm, setContactForm] = useState({
    subject: '',
    priority: 'Medium',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const supportOptions = [
    {
      icon: 'fas fa-phone',
      title: 'Phone Support',
      description: 'Call us for immediate assistance',
      contact: '+91 1800-123-4567',
      hours: '24/7 Available',
      color: 'blue'
    },
    {
      icon: 'fas fa-envelope',
      title: 'Email Support',
      description: 'Send us detailed queries',
      contact: 'support@cms.com',
      hours: 'Response within 24 hours',
      color: 'green'
    },
    {
      icon: 'fas fa-comments',
      title: 'Live Chat',
      description: 'Chat with our support team',
      contact: 'Start Chat',
      hours: '9 AM - 9 PM',
      color: 'purple'
    },
    {
      icon: 'fas fa-map-marker-alt',
      title: 'Visit Office',
      description: 'Come to our service center',
      contact: 'Find Nearest Branch',
      hours: '10 AM - 6 PM',
      color: 'orange'
    }
  ];

  const faqData = [
    {
      question: 'How do I track my package?',
      answer: 'You can track your package using the tracking number provided when you booked the courier. Go to Track Parcel section and enter your tracking ID.'
    },
    {
      question: 'What if my package is delayed?',
      answer: 'If your package is delayed beyond the expected delivery date, please raise a complaint with your tracking number. Our team will investigate and provide updates.'
    },
    {
      question: 'How do I change delivery address?',
      answer: 'Delivery address can be changed only before the package is out for delivery. Contact our support team with your tracking number and new address details.'
    },
    {
      question: 'What are the weight and size limits?',
      answer: 'Maximum weight limit is 50 kg. For bulky items, please contact our support team for special arrangements.'
    },
    {
      question: 'How do I cancel a booking?',
      answer: 'You can cancel a booking from your booking history before it is picked up. Refunds will be processed within 3-5 business days.'
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept all major credit/debit cards, UPI, net banking, and cash on delivery for certain services.'
    }
  ];

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Map frontend subjects to backend categories
      const categoryMap = {
        'Booking Issue': 'Booking Issue',
        'Delivery Problem': 'Delivery Problem', 
        'Payment Query': 'Payment',
        'Technical Support': 'Technical',
        'Account Help': 'General',
        'Feedback': 'General',
        'Other': 'Others'
      };

      const supportData = {
        subject: contactForm.subject,
        message: contactForm.message,
        category: categoryMap[contactForm.subject] || 'General'
      };

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/support/tickets`, supportData);
      
      if (response.data.success) {
        toast.success(`Support ticket created successfully! Ticket ID: ${response.data.ticket.ticketId}`);
        setContactForm({
          subject: '',
          priority: 'Medium',
          message: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting support request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Hero Section */}
      <section className="relative gradient-bg-success overflow-hidden py-20">
        <div className="absolute inset-0 hero-pattern"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <i className="fas fa-headset text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-display mb-4">
              Customer Support
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              We're here to help! Get assistance with your shipments, billing, or any other questions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Support Options */}
            <motion.div variants={itemVariants}>
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-6 text-center">
                <i className="fas fa-hands-helping text-primary-600 mr-3"></i>
                How Can We Help You?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {supportOptions.map((option, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    className="card-elevated p-6 text-center hover:shadow-xl transition-all duration-300"
                  >
                    <div className={`w-16 h-16 bg-gradient-to-br from-${option.color}-500 to-${option.color}-600 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                      <i className={`${option.icon} text-white text-2xl`}></i>
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                      {option.title}
                    </h3>
                    <p className="text-secondary-600 dark:text-secondary-400 text-sm mb-3">
                      {option.description}
                    </p>
                    <p className="text-primary-600 dark:text-primary-400 font-semibold text-sm mb-1">
                      {option.contact}
                    </p>
                    <p className="text-secondary-500 dark:text-secondary-500 text-xs">
                      {option.hours}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Tabs Navigation */}
            <motion.div variants={itemVariants}>
              <div className="flex justify-center mb-8">
                <div className="bg-white dark:bg-secondary-800 rounded-xl p-2 shadow-lg">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('contact')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        activeTab === 'contact'
                          ? 'bg-primary-600 text-white'
                          : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                      }`}
                    >
                      <i className="fas fa-envelope mr-2"></i>
                      Contact Us
                    </button>
                    <button
                      onClick={() => setActiveTab('faq')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        activeTab === 'faq'
                          ? 'bg-primary-600 text-white'
                          : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                      }`}
                    >
                      <i className="fas fa-question-circle mr-2"></i>
                      FAQ
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form Tab */}
            {activeTab === 'contact' && (
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="max-w-4xl mx-auto"
              >
                <div className="card-elevated p-8">
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-paper-plane text-white text-xl"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-secondary-800 dark:text-white mb-2">
                      Send us a Message
                    </h2>
                    <p className="text-secondary-600 dark:text-secondary-400">
                      Fill out the form below and we'll get back to you as soon as possible
                    </p>
                  </div>

                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    {/* User Information Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                          Your Name
                        </label>
                        <input
                          type="text"
                          value={user?.name || ''}
                          disabled
                          className="input-field bg-secondary-50 dark:bg-secondary-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                          Your Email
                        </label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="input-field bg-secondary-50 dark:bg-secondary-700"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                        <i className="fas fa-tag text-primary-500 mr-2"></i>
                        Subject *
                      </label>
                      <select
                        name="subject"
                        value={contactForm.subject}
                        onChange={handleChange}
                        required
                        className="input-field"
                      >
                        <option value="">Select a subject</option>
                        <option value="Booking Issue">Booking Issue</option>
                        <option value="Delivery Problem">Delivery Problem</option>
                        <option value="Payment Query">Payment Query</option>
                        <option value="Technical Support">Technical Support</option>
                        <option value="Account Help">Account Help</option>
                        <option value="Feedback">Feedback</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                        <i className="fas fa-flag text-primary-500 mr-2"></i>
                        Priority Level
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['Low', 'Medium', 'High'].map((priority) => (
                          <label
                            key={priority}
                            className={`relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              contactForm.priority === priority
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="priority"
                              value={priority}
                              checked={contactForm.priority === priority}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            <span className="font-medium text-secondary-900 dark:text-white">
                              {priority}
                            </span>
                            {contactForm.priority === priority && (
                              <i className="fas fa-check text-primary-500 absolute top-1 right-1 text-sm"></i>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                        <i className="fas fa-comment text-primary-500 mr-2"></i>
                        Message *
                      </label>
                      <textarea
                        name="message"
                        rows={6}
                        placeholder="Please describe your issue or question in detail..."
                        value={contactForm.message}
                        onChange={handleChange}
                        required
                        maxLength={1000}
                        className="input-field resize-none"
                      />
                      <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                        {contactForm.message.length}/1000 characters
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-success flex-1"
                      >
                        {loading ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Sending Message...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane mr-2"></i>
                            Send Message
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactForm({ subject: '', priority: 'Medium', message: '' })}
                        className="btn-outline-secondary"
                      >
                        <i className="fas fa-undo mr-2"></i>
                        Reset
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="max-w-4xl mx-auto"
              >
                <div className="card-elevated p-8">
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-question-circle text-white text-xl"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-secondary-800 dark:text-white mb-2">
                      Frequently Asked Questions
                    </h2>
                    <p className="text-secondary-600 dark:text-secondary-400">
                      Find quick answers to common questions
                    </p>
                  </div>

                  <div className="space-y-4">
                    {faqData.map((faq, index) => (
                      <motion.div
                        key={index}
                        variants={itemVariants}
                        className="border border-secondary-200 dark:border-secondary-700 rounded-xl overflow-hidden"
                      >
                        <details className="group">
                          <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors duration-200">
                            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white pr-4">
                              {faq.question}
                            </h3>
                            <i className="fas fa-chevron-down text-secondary-400 group-open:rotate-180 transition-transform duration-200"></i>
                          </summary>
                          <div className="px-6 pb-6">
                            <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </details>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Emergency Contact */}
            <motion.div variants={itemVariants}>
              <div className="card-elevated p-6 border-l-4 border-red-500">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                      Emergency Support
                    </h3>
                    <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                      For urgent issues that need immediate attention, please call our emergency helpline:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a
                        href="tel:+911800123456"
                        className="btn-danger"
                      >
                        <i className="fas fa-phone mr-2"></i>
                        Call Emergency: +91 1800-123-456
                      </a>
                      <p className="text-sm text-secondary-500 dark:text-secondary-400 self-center">
                        Available 24/7 for critical issues
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Support; 