import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { showToast } from '../../utils/toastUtils';
import axios from 'axios';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui';

const BookingHistory = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Helper function to get axios with proper headers
  const getAxiosConfig = () => {
    const token = sessionStorage.getItem('customerToken');
    return {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    };
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/customer/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/bookings/my?${params}`, getAxiosConfig());
      
      if (response.data.success) {
        const bookings = response.data.bookings;
        
        // Debug: Log booking data structure
        console.log('BookingHistory - Raw booking data:', bookings);
        if (bookings.length > 0) {
          console.log('BookingHistory - First booking structure:', Object.keys(bookings[0]));
          console.log('BookingHistory - First booking status field:', bookings[0].status);
        }
        
        setBookings(bookings);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        showToast.error('Session expired. Please login again.');
        navigate('/customer/login');
      } else {
        showToast.error('Error fetching bookings');
        console.error('Error:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.current, filters.status, filters.search, navigate]);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchBookings();
    }
  }, [isAuthenticated, fetchBookings]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current: newPage }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Pending Pickup': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Courier Pickup': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Picked Up': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Shipped': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'In Transit': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Intransit': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Arrived at Destination': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'Out for Delivery': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Delivered': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Pickup Failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Delivery Failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Pending Pickup': 'fas fa-clock',
      'Courier Pickup': 'fas fa-clock',
      'Picked Up': 'fas fa-hand-holding-box',
      'Shipped': 'fas fa-shipping-fast',
      'In Transit': 'fas fa-route',
      'Intransit': 'fas fa-route',
      'Arrived at Destination': 'fas fa-map-marker-alt',
      'Out for Delivery': 'fas fa-truck',
      'Delivered': 'fas fa-check-circle',
      'Cancelled': 'fas fa-times-circle',
      'Pickup Failed': 'fas fa-exclamation-triangle',
      'Delivery Failed': 'fas fa-exclamation-triangle'
    };
    return icons[status] || 'fas fa-info-circle';
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const formatAddress = (address) => {
    if (typeof address === 'string') return address;
    
    if (typeof address === 'object' && address !== null) {
      const { street, city, state, pincode, country } = address;
      return [street, city, state, pincode, country]
        .filter(Boolean)
        .join(', ');
    }
    
    return 'Address not available';
  };

  const BookingDetailsModal = ({ booking, onClose }) => {
    if (!booking) return null;
    
    return (
      <Modal
        isOpen={showDetailsModal}
        onClose={onClose}
        title="Booking Details"
      >
        <div className="space-y-6">
          {/* Tracking Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tracking Information
              </h3>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(booking.status || booking.courierStatus || booking.deliveryStatus)}`}>
                <i className={`${getStatusIcon(booking.status || booking.courierStatus || booking.deliveryStatus)} mr-2`}></i>
                {booking.status || booking.courierStatus || booking.deliveryStatus || 'Status Not Available'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tracking ID</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{booking.trackingId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Booked On</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {moment(booking.createdAt).format('MMM DD, YYYY')}
                </p>
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Package Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Package Type</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{booking.packageType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Weight</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{booking.weight} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dimensions</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {booking.dimensions ? `${booking.dimensions.length}x${booking.dimensions.width}x${booking.dimensions.height} cm` : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cost</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">₹{booking.estimatedCost}</p>
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pickup & Delivery Details
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Pickup Address</p>
                <p className="text-base text-gray-900 dark:text-white">{formatAddress(booking.pickupAddress)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {moment(booking.pickupDate).format('MMM DD, YYYY')}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2">Delivery Address</p>
                <p className="text-base text-gray-900 dark:text-white">{formatAddress(booking.deliveryAddress)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Expected by {moment(booking.expectedDeliveryDate).format('MMM DD, YYYY')}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Close
            </button>
            <Link
              to={`/track-parcel?id=${booking.trackingId}`}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700"
            >
              Track Package
            </Link>
          </div>
        </div>
      </Modal>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <section className="relative bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden py-16">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <i className="fas fa-history text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-display mb-4">
              Booking History
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              View and manage all your courier bookings in one place
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
            {/* Filters */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Bookings
                  </label>
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      placeholder="Search by tracking ID, destination..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="block w-full pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  >
                    <option value="">All Status</option>
                    <option value="Courier Pickup">Courier Pickup</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Intransit">In Transit</option>
                    <option value="Arrived at Destination">Arrived at Destination</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Pickup Failed">Pickup Failed</option>
                    <option value="Delivery Failed">Delivery Failed</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Bookings List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : bookings.length === 0 ? (
              <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-box-open text-blue-500 dark:text-blue-400 text-3xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Bookings Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You haven't made any bookings yet or no bookings match your search criteria.
                </p>
                <Link to="/customer/book-courier" className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <i className="fas fa-plus mr-2"></i>
                  Book Your First Courier
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <motion.div
                    key={booking._id}
                    variants={itemVariants}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      {/* Booking Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                              <i className="fas fa-box text-white"></i>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                              {booking.trackingId}
                            </h3>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">
                              {booking.packageType} • ₹{booking.estimatedCost}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                              From
                            </h4>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">
                              {booking.pickupAddress?.city && booking.pickupAddress?.state 
                                ? `${booking.pickupAddress.city}, ${booking.pickupAddress.state}`
                                : 'Pickup address not available'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                              To
                            </h4>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">
                              {booking.deliveryAddress?.city && booking.deliveryAddress?.state 
                                ? `${booking.deliveryAddress.city}, ${booking.deliveryAddress.state}`
                                : 'Delivery address not available'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                              Pickup Date
                            </h4>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">
                              {moment(booking.pickupDate).format('MMM DD, YYYY')}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                              Expected Delivery
                            </h4>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">
                              {moment(booking.expectedDeliveryDate).format('MMM DD, YYYY')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex flex-col items-start lg:items-end space-y-4">
                        <div className="flex items-center space-x-2">
                          <i className={`${getStatusIcon(booking.status || booking.courierStatus || booking.deliveryStatus)} text-sm`}></i>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(booking.status || booking.courierStatus || booking.deliveryStatus)}`}>
                            {booking.status || booking.courierStatus || booking.deliveryStatus || 'Status Unknown'}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link
                            to={`/customer/track-parcel?id=${booking.trackingId}`}
                            className="btn-outline-primary text-sm"
                          >
                            <i className="fas fa-search mr-2"></i>
                            Track
                          </Link>
                          <button
                            onClick={() => handleViewDetails(booking)}
                            className="btn-outline-secondary text-sm"
                          >
                            <i className="fas fa-eye mr-2"></i>
                            Details
                          </button>
                        </div>

                        <p className="text-xs text-secondary-500 dark:text-secondary-400">
                          Booked on {moment(booking.createdAt).format('MMM DD, YYYY')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && bookings.length > 0 && pagination.total > 1 && (
              <motion.div variants={itemVariants} className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={!pagination.hasPrev}
                  className="btn-outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left mr-2"></i>
                  Previous
                </button>

                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${
                          page === pagination.current
                            ? 'bg-primary-600 text-white'
                            : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={!pagination.hasNext}
                  className="btn-outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <i className="fas fa-chevron-right ml-2"></i>
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
      
      {/* Details Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedBooking(null);
        }}
      />
    </div>
  );
};

export default BookingHistory; 