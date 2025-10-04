import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { showToast } from '../../utils/toastUtils';
import { motion } from 'framer-motion';
import axios from 'axios';
import clsx from 'clsx';
import { TrackingTimeline } from '../../components/ui';

const TrackParcel = () => {
  const [searchData, setSearchData] = useState('');
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const handleSearch = useCallback(async (refNumber = searchData) => {
    if (!refNumber.trim()) {
      showToast.error('Please enter a tracking number');
      return;
    }

    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      // Use the new enhanced tracking API
      const response = await axios.get(`${baseURL}/api/tracking/enhanced/${refNumber.trim()}`);

      if (response.data.success) {
        setTrackingInfo(response.data.trackingInfo);
        showToast.success('Package found! Here are the latest updates.');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        showToast.error('Package not found. Please check your tracking number.');
        setTrackingInfo(null);
      } else {
        showToast.error('Unable to fetch tracking information. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [searchData]);

  useEffect(() => {
    // Check if search data was passed from URL params or state
    const trackingId = searchParams.get('id') || location.state?.searchData;
    if (trackingId) {
      setSearchData(trackingId);
      handleSearch(trackingId);
    }
  }, [location.state, searchParams, handleSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const getDeliveryStatusCard = () => {
    if (!trackingInfo) return null;

    if (trackingInfo.isDelivered) {
      return (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
              <i className="fas fa-check text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Package Delivered</h3>
              <p className="text-green-600 dark:text-green-400">Your package has been delivered successfully</p>
            </div>
          </div>
        </div>
      );
    }

    if (trackingInfo.isOutForDelivery) {
      return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
              <i className="fas fa-truck text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Out for Delivery</h3>
              <p className="text-blue-600 dark:text-blue-400">Your package is out for delivery - {trackingInfo.estimatedDelivery}</p>
            </div>
          </div>
        </div>
      );
    }

    if (trackingInfo.isInTransit) {
      return (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mr-4">
              <i className="fas fa-route text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300">In Transit</h3>
              <p className="text-purple-600 dark:text-purple-400">Your package is on the way - {trackingInfo.estimatedDelivery}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mr-4">
            <i className="fas fa-clock text-white text-xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">Processing</h3>
            <p className="text-yellow-600 dark:text-yellow-400">Your package is being processed - {trackingInfo.estimatedDelivery}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Header Section */}
      <div className="bg-white dark:bg-secondary-800 shadow-sm border-b border-gray-200 dark:border-secondary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-search-location text-white text-2xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Track Your Package</h1>
            <p className="text-gray-600 dark:text-gray-400">Enter your tracking number to get real-time updates</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6 mb-8">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter tracking number (e.g., 123456789)"
                value={searchData}
                onChange={(e) => setSearchData(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white dark:bg-secondary-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'px-6 py-3 bg-blue-500 text-white rounded-lg font-medium transition-colors',
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
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
          </form>
        </div>

        {/* Tracking Results */}
        {trackingInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header with Package Info */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {trackingInfo.packageInfo.description}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-medium">Tracking ID:</span> {trackingInfo.trackingId}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Ordered:</span> {trackingInfo.orderDate}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {trackingInfo.estimatedDelivery}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {trackingInfo.shippingMethod.name}
                  </div>
                </div>
              </div>

              {/* Amazon-style Status Alert */}
              {getDeliveryStatusCard()}
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Package Journey</h3>
              <TrackingTimeline timeline={trackingInfo.timeline} isLoading={loading} />
            </div>

            {/* Package Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping Details */}
              <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shipping Details</h3>
                <div className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Carrier</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{trackingInfo.shippingMethod.carrier}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Service</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{trackingInfo.shippingMethod.service}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Weight</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{trackingInfo.packageInfo.weight} kg</dd>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Address</h3>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900 dark:text-white">{trackingInfo.recipient.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{trackingInfo.recipient.address}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {trackingInfo.recipient.city}, {trackingInfo.recipient.state} - {trackingInfo.recipient.pincode}
                  </p>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Need Help?</h3>
              <p className="text-blue-700 dark:text-blue-400 mb-4">{trackingInfo.nextUpdate}</p>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-md text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors">
                  <i className="fas fa-phone mr-2"></i>
                  Contact Support
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-md text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors">
                  <i className="fas fa-envelope mr-2"></i>
                  Email Updates
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* No results message */}
        {!loading && !trackingInfo && searchData && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-search text-gray-400 dark:text-gray-500 text-xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No package found</h3>
            <p className="text-gray-600 dark:text-gray-400">Please check your tracking number and try again.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackParcel; 