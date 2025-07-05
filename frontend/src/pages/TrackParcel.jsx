import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import axios from 'axios';
import moment from 'moment';
import clsx from 'clsx';

const TrackParcel = () => {
  const [searchData, setSearchData] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if search data was passed from home page
    if (location.state?.searchData) {
      setSearchData(location.state.searchData);
      handleSearch(location.state.searchData);
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (refNumber = searchData) => {
    if (!refNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/tracking/search', {
        refNumber: refNumber.trim()
      });

      if (response.data.success) {
        setTrackingResult(response.data.data);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Invalid Tracking / Reference Number');
        setTrackingResult(null);
      } else {
        toast.error('Error occurred while tracking. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Courier Pickup':
        return 'status-badge-processing';
      case 'Shipped':
        return 'status-badge-shipped';
      case 'Intransit':
        return 'status-badge-pending';
      case 'Arrived at Destination':
        return 'status-badge-processing';
      case 'Out for Delivery':
        return 'status-badge-pending';
      case 'Delivered':
        return 'status-badge-delivered';
      default:
        return 'status-badge-processing';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Courier Pickup':
        return <i className="fas fa-hand-holding-box"></i>;
      case 'Shipped':
        return <i className="fas fa-shipping-fast"></i>;
      case 'Intransit':
        return <i className="fas fa-route"></i>;
      case 'Arrived at Destination':
        return <i className="fas fa-map-marker-alt"></i>;
      case 'Out for Delivery':
        return <i className="fas fa-truck"></i>;
      case 'Delivered':
        return <i className="fas fa-check-circle"></i>;
      default:
        return <i className="fas fa-info"></i>;
    }
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
              <i className="fas fa-search text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-display mb-4">
              Track Your Package
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Enter your tracking number to get real-time updates on your shipment status and location
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
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-barcode text-white text-xl"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">Enter Tracking Number</h2>
                  <p className="text-secondary-600 dark:text-secondary-400">Input your reference number to start tracking</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-secondary-700 mb-2">
                        <i className="fas fa-hashtag text-primary-500 mr-2"></i>
                        Tracking / Reference Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your tracking number (e.g., 997614830)"
                        value={searchData}
                        onChange={(e) => setSearchData(e.target.value)}
                        required
                        className="input-field text-lg"
                      />
                    </div>
                    <div className="sm:mt-7">
                      <button
                        type="submit"
                        disabled={loading}
                        className={clsx(
                          'btn-primary w-full sm:w-auto px-8 py-4 text-lg',
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
                            Track Package
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>

            {/* Demo Alert */}
            {!trackingResult && (
              <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
                <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 text-center">
                  <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-info text-white"></i>
                  </div>
                  <p className="text-primary-800 font-medium">
                    <strong>Try our demo:</strong> Use tracking number{' '}
                    <code className="bg-primary-100 px-2 py-1 rounded text-primary-900 font-mono">
                      997614830
                    </code>{' '}
                    to see how tracking works
                  </p>
                </div>
              </motion.div>
            )}

            {/* Tracking Results */}
            {trackingResult && (
              <motion.div
                variants={itemVariants}
                className="space-y-8"
              >
                {/* Package Header */}
                <div className="card-elevated p-6 text-center gradient-bg text-white">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mr-4">
                      <i className="fas fa-package text-2xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-1">
                        Package Details
                      </h2>
                      <p className="text-xl font-mono bg-white/20 px-4 py-2 rounded-lg inline-block">
                        {trackingResult.courier.refNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sender & Recipient Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Sender Information */}
                  <motion.div
                    variants={itemVariants}
                    className="card group hover-glow"
                  >
                    <div className="p-6">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center mr-4">
                          <i className="fas fa-user text-white text-lg"></i>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-secondary-800">Sender Information</h3>
                          <p className="text-secondary-600">Package sender details</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {[
                          { icon: 'fas fa-user', label: 'Name', value: trackingResult.courier.sender.name },
                          { icon: 'fas fa-city', label: 'City', value: trackingResult.courier.sender.city },
                          { icon: 'fas fa-map', label: 'State', value: trackingResult.courier.sender.state },
                          { icon: 'fas fa-mail-bulk', label: 'Pincode', value: trackingResult.courier.sender.pincode },
                          { icon: 'fas fa-globe', label: 'Country', value: trackingResult.courier.sender.country }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center p-3 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors duration-200">
                            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center mr-3">
                              <i className={`${item.icon} text-white text-sm`}></i>
                            </div>
                            <div>
                              <div className="text-sm text-secondary-600">{item.label}</div>
                              <div className="font-semibold text-secondary-800">{item.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Recipient Information */}
                  <motion.div
                    variants={itemVariants}
                    className="card group hover-glow"
                  >
                    <div className="p-6">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-4">
                          <i className="fas fa-user-check text-white text-lg"></i>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-secondary-800">Recipient Information</h3>
                          <p className="text-secondary-600">Package recipient details</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {[
                          { icon: 'fas fa-user', label: 'Name', value: trackingResult.courier.recipient.name },
                          { icon: 'fas fa-city', label: 'City', value: trackingResult.courier.recipient.city },
                          { icon: 'fas fa-map', label: 'State', value: trackingResult.courier.recipient.state },
                          { icon: 'fas fa-mail-bulk', label: 'Pincode', value: trackingResult.courier.recipient.pincode },
                          { icon: 'fas fa-globe', label: 'Country', value: trackingResult.courier.recipient.country }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center p-3 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors duration-200">
                            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center mr-3">
                              <i className={`${item.icon} text-white text-sm`}></i>
                            </div>
                            <div>
                              <div className="text-sm text-secondary-600">{item.label}</div>
                              <div className="font-semibold text-secondary-800">{item.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Tracking History */}
                {trackingResult.trackingHistory && trackingResult.trackingHistory.length > 0 ? (
                  <motion.div variants={itemVariants} className="card-elevated">
                    <div className="p-6">
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-warning-500 to-warning-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-route text-white text-2xl"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-secondary-800 mb-2">Tracking History</h3>
                        <p className="text-secondary-600">Complete journey of your package</p>
                      </div>

                      <div className="space-y-4 max-w-4xl mx-auto">
                        {trackingResult.trackingHistory.map((track, index) => (
                          <motion.div
                            key={index}
                            variants={itemVariants}
                            className="flex items-center p-4 bg-white border border-secondary-200 rounded-2xl hover:shadow-lg transition-all duration-300"
                          >
                            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mr-4 text-white">
                              {getStatusIcon(track.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                <div>
                                  <div className="flex items-center mb-2">
                                    <span className={clsx(
                                      'px-3 py-1 rounded-full text-sm font-semibold border',
                                      getStatusBadgeClass(track.status)
                                    )}>
                                      {track.status}
                                    </span>
                                  </div>
                                  <p className="text-secondary-600">{track.remark}</p>
                                </div>
                                <div className="flex items-center text-secondary-500 mt-2 sm:mt-0">
                                  <i className="fas fa-clock mr-2"></i>
                                  <span className="font-mono">
                                    {moment(track.date).format('DD/MM/YYYY HH:mm:ss')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div variants={itemVariants} className="text-center py-16">
                    <div className="w-24 h-24 bg-warning-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-exclamation-triangle text-warning-600 text-3xl"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-warning-800 mb-4">
                      Package Not Shipped Yet
                    </h3>
                    <p className="text-secondary-600 max-w-md mx-auto">
                      Your package has been registered but hasn't been shipped yet. 
                      Please check back later for tracking updates.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default TrackParcel; 