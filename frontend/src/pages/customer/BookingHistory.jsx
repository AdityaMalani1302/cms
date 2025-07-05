import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext';

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
        setBookings(response.data.bookings);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/customer/login');
      } else {
        toast.error('Error fetching bookings');
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
      'Picked Up': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'In Transit': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Out for Delivery': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Delivered': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Pending Pickup': 'fas fa-clock',
      'Picked Up': 'fas fa-hand-holding-box',
      'In Transit': 'fas fa-route',
      'Out for Delivery': 'fas fa-truck',
      'Delivered': 'fas fa-check-circle',
      'Cancelled': 'fas fa-times-circle'
    };
    return icons[status] || 'fas fa-info-circle';
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
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Header */}
      <section className="relative gradient-bg-primary overflow-hidden py-16">
        <div className="absolute inset-0 hero-pattern"></div>
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
            <motion.div variants={itemVariants} className="card-elevated p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Search Bookings
                  </label>
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400"></i>
                    <input
                      type="text"
                      placeholder="Search by tracking ID, destination..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Status</option>
                    <option value="Pending Pickup">Pending Pickup</option>
                    <option value="Picked Up">Picked Up</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Bookings List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : bookings.length === 0 ? (
              <motion.div variants={itemVariants} className="card-elevated p-12 text-center">
                <div className="w-24 h-24 bg-secondary-100 dark:bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-box-open text-secondary-400 text-3xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
                  No Bookings Found
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  You haven't made any bookings yet or no bookings match your search criteria.
                </p>
                <Link to="/customer/book-courier" className="btn-primary">
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
                    className="card-elevated p-6 hover:shadow-xl transition-all duration-300"
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
                              {booking.pickupAddress?.city}, {booking.pickupAddress?.state}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                              To
                            </h4>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">
                              {booking.deliveryAddress?.city}, {booking.deliveryAddress?.state}
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
                          <i className={`${getStatusIcon(booking.status)} text-sm`}></i>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(booking.status)}`}>
                            {booking.status}
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
                          <Link
                            to={`/customer/booking-details/${booking._id}`}
                            className="btn-outline-secondary text-sm"
                          >
                            <i className="fas fa-eye mr-2"></i>
                            Details
                          </Link>
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
    </div>
  );
};

export default BookingHistory; 