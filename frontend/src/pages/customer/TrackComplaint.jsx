import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import axios from 'axios';
import moment from 'moment';
import clsx from 'clsx';

const TrackComplaint = () => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [complaintResult, setComplaintResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const handleTrack = useCallback(async (ticket = ticketNumber) => {
    if (!ticket.trim()) {
      toast.error('Please enter a ticket number');
      return;
    }

    setLoading(true);
    setComplaintResult(null);

    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/complaints/track/${ticket.trim()}`);
      
      if (response.data.success) {
        setComplaintResult(response.data.data);
        toast.success('Complaint found successfully');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Invalid ticket number. Please check and try again.');
      } else {
        toast.error('Error tracking complaint. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [ticketNumber]);

  useEffect(() => {
    // Check if ticket number was passed from URL params or state
    const ticket = searchParams.get('ticket') || location.state?.ticketNumber;
    if (ticket) {
      setTicketNumber(ticket);
      handleTrack(ticket);
    }
  }, [location.state, searchParams, handleTrack]);

  // Set up real-time updates for complaint status
  useEffect(() => {
    let interval;
    if (complaintResult && ticketNumber) {
      // Refresh complaint data every 30 seconds to show real-time updates
      interval = setInterval(() => {
        handleTrack(ticketNumber);
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [complaintResult, ticketNumber, handleTrack]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleTrack();
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Open': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Pending Customer Response': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Closed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Open': 'fas fa-envelope-open',
      'In Progress': 'fas fa-cog fa-spin',
      'Pending Customer Response': 'fas fa-clock',
      'Resolved': 'fas fa-check-circle',
      'Closed': 'fas fa-times-circle'
    };
    return icons[status] || 'fas fa-info-circle';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      'Low': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return badges[priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
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
      <section className="relative gradient-bg-warning overflow-hidden py-20">
        <div className="absolute inset-0 hero-pattern"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <i className="fas fa-ticket-alt text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-display mb-4">
              Track Your Complaint
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Enter your ticket number to check the status and progress of your complaint
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
            {/* Search Form */}
            <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
              <div className="card-elevated p-8">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-search text-white text-xl"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-800 dark:text-white mb-2">Enter Ticket Number</h2>
                  <p className="text-secondary-600 dark:text-secondary-400">Input your complaint ticket number to check status</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                        <i className="fas fa-hashtag text-orange-500 mr-2"></i>
                        Ticket Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your ticket number (e.g., TKT000001)"
                        value={ticketNumber}
                        onChange={(e) => setTicketNumber(e.target.value)}
                        required
                        className="input-field text-lg"
                      />
                    </div>
                    <div className="sm:mt-7">
                      <button
                        type="submit"
                        disabled={loading}
                        className={clsx(
                          'btn-warning w-full sm:w-auto px-8 py-4 text-lg',
                          loading && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {loading ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Searching...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-search mr-2"></i>
                            Track Complaint
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>

            {/* Complaint Results */}
            {complaintResult && (
              <motion.div variants={itemVariants} className="max-w-6xl mx-auto">
                <div className="card-elevated p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
                      Complaint Details
                    </h2>
                    <p className="text-secondary-600 dark:text-secondary-400">
                      Ticket: <span className="font-semibold text-orange-600">{complaintResult.ticketNumber}</span>
                    </p>
                  </div>

                  {/* Status Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-6 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                      <div className="flex items-center justify-center mb-3">
                        <i className={`${getStatusIcon(complaintResult.status)} text-2xl text-primary-600`}></i>
                      </div>
                      <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">Current Status</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(complaintResult.status)}`}>
                        {complaintResult.status}
                      </span>
                    </div>

                    <div className="text-center p-6 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                      <div className="flex items-center justify-center mb-3">
                        <i className="fas fa-flag text-2xl text-orange-600"></i>
                      </div>
                      <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">Priority</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadge(complaintResult.priority)}`}>
                        {complaintResult.priority}
                      </span>
                    </div>

                    <div className="text-center p-6 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                      <div className="flex items-center justify-center mb-3">
                        <i className="fas fa-calendar text-2xl text-green-600"></i>
                      </div>
                      <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">Created On</h3>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                        {moment(complaintResult.createdAt).format('MMM DD, YYYY')}
                      </p>
                    </div>
                  </div>

                  {/* Complaint Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white border-b border-secondary-200 dark:border-secondary-700 pb-2">
                        <i className="fas fa-info-circle text-primary-600 mr-2"></i>
                        Complaint Information
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Tracking Number</p>
                          <p className="text-secondary-600 dark:text-secondary-400 font-mono">
                            {complaintResult.trackingNumber}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Category</p>
                          <p className="text-secondary-600 dark:text-secondary-400">
                            {complaintResult.complaintCategory}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Brief Description</p>
                          <p className="text-secondary-600 dark:text-secondary-400">
                            {complaintResult.natureOfComplaint}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Detailed Description</p>
                          <div className="p-4 bg-secondary-100 dark:bg-secondary-700 rounded-lg">
                            <p className="text-secondary-600 dark:text-secondary-400 text-sm whitespace-pre-wrap">
                              {complaintResult.issueDescription}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Timeline */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white border-b border-secondary-200 dark:border-secondary-700 pb-2">
                        <i className="fas fa-clock text-primary-600 mr-2"></i>
                        Progress Timeline
                      </h3>

                      <div className="space-y-4">
                        {/* Created */}
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-plus text-blue-600 text-sm"></i>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-secondary-900 dark:text-white">Complaint Submitted</p>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">
                              {moment(complaintResult.createdAt).format('MMM DD, YYYY [at] HH:mm')}
                            </p>
                          </div>
                        </div>

                        {/* Last Updated */}
                        {complaintResult.updationDate && (
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center flex-shrink-0">
                              <i className="fas fa-edit text-yellow-600 text-sm"></i>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-secondary-900 dark:text-white">Last Updated</p>
                              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                                {moment(complaintResult.updationDate).format('MMM DD, YYYY [at] HH:mm')}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Resolution (if resolved) */}
                        {complaintResult.status === 'Resolved' && (
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                              <i className="fas fa-check text-green-600 text-sm"></i>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-secondary-900 dark:text-white">Complaint Resolved</p>
                              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                                Issue has been resolved successfully
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Remarks */}
                  {complaintResult.remark && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                        <i className="fas fa-comment text-primary-600 mr-2"></i>
                        Admin Remarks
                      </h3>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded-lg">
                        <p className="text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">
                          {complaintResult.remark}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-secondary-200 dark:border-secondary-700">
                    <button
                      onClick={() => window.print()}
                      className="btn-outline-primary"
                    >
                      <i className="fas fa-print mr-2"></i>
                      Print Details
                    </button>
                    
                    {complaintResult.status !== 'Resolved' && complaintResult.status !== 'Closed' && (
                      <a
                        href="/customer/support"
                        className="btn-outline-secondary"
                      >
                        <i className="fas fa-headset mr-2"></i>
                        Contact Support
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setTicketNumber('');
                        setComplaintResult(null);
                      }}
                      className="btn-outline-warning"
                    >
                      <i className="fas fa-search mr-2"></i>
                      Track Another
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            {!complaintResult && (
              <motion.div variants={itemVariants}>
                <div className="card-elevated p-6">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 text-center">
                    <i className="fas fa-hand-point-right text-primary-600 mr-2"></i>
                    Need Help?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                      href="/customer/raise-complaint"
                      className="block p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors duration-200 text-center"
                    >
                      <i className="fas fa-exclamation-triangle text-red-600 text-2xl mb-2"></i>
                      <h4 className="font-semibold text-secondary-900 dark:text-white mb-1">Raise New Complaint</h4>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">Report a new issue</p>
                    </a>
                    
                    <a
                      href="/customer/track-parcel"
                      className="block p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors duration-200 text-center"
                    >
                      <i className="fas fa-search-location text-blue-600 text-2xl mb-2"></i>
                      <h4 className="font-semibold text-secondary-900 dark:text-white mb-1">Track Parcel</h4>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">Check shipment status</p>
                    </a>
                    
                    <a
                      href="/customer/support"
                      className="block p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-colors duration-200 text-center"
                    >
                      <i className="fas fa-headset text-green-600 text-2xl mb-2"></i>
                      <h4 className="font-semibold text-secondary-900 dark:text-white mb-1">Get Support</h4>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">Contact our team</p>
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default TrackComplaint; 