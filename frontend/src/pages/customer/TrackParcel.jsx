import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if search data was passed from URL params or state
    const trackingId = searchParams.get('id') || location.state?.searchData;
    if (trackingId) {
      setSearchData(trackingId);
      handleSearch(trackingId);
    }
  }, [location.state, searchParams]);

  const handleSearch = async (refNumber = searchData) => {
    if (!refNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }

    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/customer-tracking/${refNumber.trim()}`);

      if (response.data.success) {
        setTrackingResult(response.data.booking);
        toast.success('Tracking information found');
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
      case 'Pending Pickup':
        return 'status-badge-pending';
      case 'Picked Up':
        return 'status-badge-processing';
      case 'In Transit':
        return 'status-badge-shipped';
      case 'Out for Delivery':
        return 'status-badge-processing';
      case 'Delivered':
        return 'status-badge-delivered';
      case 'Cancelled':
        return 'status-badge-cancelled';
      default:
        return 'status-badge-pending';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending Pickup':
        return <i className="fas fa-clock"></i>;
      case 'Picked Up':
        return <i className="fas fa-hand-holding-box"></i>;
      case 'In Transit':
        return <i className="fas fa-route"></i>;
      case 'Out for Delivery':
        return <i className="fas fa-truck"></i>;
      case 'Delivered':
        return <i className="fas fa-check-circle"></i>;
      case 'Cancelled':
        return <i className="fas fa-times-circle"></i>;
      default:
        return <i className="fas fa-info-circle"></i>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending Pickup':
        return 'text-yellow-600';
      case 'Picked Up':
        return 'text-blue-600';
      case 'In Transit':
        return 'text-purple-600';
      case 'Out for Delivery':
        return 'text-orange-600';
      case 'Delivered':
        return 'text-green-600';
      case 'Cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressPercentage = (status) => {
    switch (status) {
      case 'Pending Pickup':
        return 10;
      case 'Picked Up':
        return 30;
      case 'In Transit':
        return 60;
      case 'Out for Delivery':
        return 85;
      case 'Delivered':
        return 100;
      case 'Cancelled':
        return 0;
      default:
        return 0;
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
      <section className="relative gradient-bg-success overflow-hidden py-20">
        <div className="absolute inset-0 hero-pattern"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <i className="fas fa-search-location text-white text-3xl"></i>
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
                  <h2 className="text-2xl font-bold text-secondary-800 dark:text-white mb-2">Enter Tracking Number</h2>
                  <p className="text-secondary-600 dark:text-secondary-400">Input your reference number to start tracking</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                        <i className="fas fa-hashtag text-primary-500 mr-2"></i>
                        Tracking / Reference Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your tracking number (e.g., TRK123456789)"
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

            {/* Tracking Results */}
            {trackingResult && (
              <motion.div variants={itemVariants} className="max-w-6xl mx-auto">
                <div className="card-elevated p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
                      Package Details
                    </h2>
                    <p className="text-secondary-600 dark:text-secondary-400">
                      Tracking ID: <span className="font-semibold text-primary-600">{trackingResult.trackingId}</span>
                    </p>
                  </div>

                  {/* Status Progress */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
                        Current Status
                      </h3>
                      <span className={clsx(
                        'inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold',
                        getStatusBadgeClass(trackingResult.status)
                      )}>
                        <span className={clsx('mr-2', getStatusColor(trackingResult.status))}>
                          {getStatusIcon(trackingResult.status)}
                        </span>
                        {trackingResult.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative">
                      <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${getProgressPercentage(trackingResult.status)}%` }}
                        ></div>
                      </div>
                      <div className="absolute top-1/2 left-0 transform -translate-y-1/2 text-xs font-medium text-white bg-primary-600 px-2 py-1 rounded-full"
                           style={{ left: `${Math.max(getProgressPercentage(trackingResult.status) - 5, 0)}%` }}>
                        {getProgressPercentage(trackingResult.status)}%
                      </div>
                    </div>
                  </div>

                  {/* Package Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Pickup Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white border-b border-secondary-200 dark:border-secondary-700 pb-2">
                        <i className="fas fa-map-marker-alt text-primary-600 mr-2"></i>
                        Pickup Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Address</p>
                          <p className="text-secondary-600 dark:text-secondary-400">
                            {trackingResult.pickupAddress?.street}, {trackingResult.pickupAddress?.city}, {trackingResult.pickupAddress?.state} - {trackingResult.pickupAddress?.pincode}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Pickup Date</p>
                          <p className="text-secondary-600 dark:text-secondary-400">
                            {moment(trackingResult.pickupDate).format('MMMM DD, YYYY [at] HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white border-b border-secondary-200 dark:border-secondary-700 pb-2">
                        <i className="fas fa-flag-checkered text-primary-600 mr-2"></i>
                        Delivery Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Address</p>
                          <p className="text-secondary-600 dark:text-secondary-400">
                            {trackingResult.deliveryAddress?.street}, {trackingResult.deliveryAddress?.city}, {trackingResult.deliveryAddress?.state} - {trackingResult.deliveryAddress?.pincode}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Recipient</p>
                          <p className="text-secondary-600 dark:text-secondary-400">
                            {trackingResult.recipientName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Expected Delivery</p>
                          <p className="text-secondary-600 dark:text-secondary-400">
                            {moment(trackingResult.expectedDeliveryDate).format('MMMM DD, YYYY')}
                          </p>
                        </div>
                        {trackingResult.actualDeliveryDate && (
                          <div>
                            <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Actual Delivery</p>
                            <p className="text-green-600 dark:text-green-400 font-semibold">
                              {moment(trackingResult.actualDeliveryDate).format('MMMM DD, YYYY [at] HH:mm')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Package Information */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                      <i className="fas fa-box text-primary-600 text-2xl mb-2"></i>
                      <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Package Type</p>
                      <p className="text-secondary-900 dark:text-white font-semibold">{trackingResult.packageType}</p>
                    </div>
                    <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                      <i className="fas fa-weight text-primary-600 text-2xl mb-2"></i>
                      <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Weight</p>
                      <p className="text-secondary-900 dark:text-white font-semibold">{trackingResult.weight} kg</p>
                    </div>
                    <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                      <i className="fas fa-tachometer-alt text-primary-600 text-2xl mb-2"></i>
                      <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Delivery Speed</p>
                      <p className="text-secondary-900 dark:text-white font-semibold">{trackingResult.deliverySpeed}</p>
                    </div>
                    <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                      <i className="fas fa-rupee-sign text-primary-600 text-2xl mb-2"></i>
                      <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Cost</p>
                      <p className="text-secondary-900 dark:text-white font-semibold">₹{trackingResult.estimatedCost}</p>
                    </div>
                  </div>

                  {/* Status History */}
                  {trackingResult.statusHistory && trackingResult.statusHistory.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                        <i className="fas fa-history text-primary-600 mr-2"></i>
                        Status History
                      </h3>
                      <div className="space-y-4">
                        {trackingResult.statusHistory.map((history, index) => (
                          <div key={index} className="flex items-start space-x-4 p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                            <div className={clsx(
                              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                              getStatusColor(history.status).replace('text-', 'bg-').replace('-600', '-100 text-') + getStatusColor(history.status).split('-')[1] + '-600'
                            )}>
                              {getStatusIcon(history.status)}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-secondary-900 dark:text-white">{history.status}</p>
                              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                                {moment(history.timestamp).format('MMMM DD, YYYY [at] HH:mm')}
                              </p>
                              {history.location && (
                                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                                  <i className="fas fa-map-marker-alt mr-1"></i>
                                  {history.location}
                                </p>
                              )}
                              {history.notes && (
                                <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                                  {history.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default TrackParcel; 