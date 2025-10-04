import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    deliveredBookings: 0,
    unreadNotifications: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [complaintsWithResponses, setComplaintsWithResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('customerToken');
      const config = {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      const [bookingsRes, complaintsRes, complaintsWithResponsesRes, notificationsRes] = await Promise.all([
        axios.get(`${baseURL}/api/bookings/my?limit=5`, config).catch(err => {
          console.warn('Bookings fetch failed:', err.response?.status);
          return { data: { success: false, bookings: [] } };
        }),
        axios.get(`${baseURL}/api/complaints/my/${user?.email}?limit=5`, config).catch(err => {
          console.warn('Complaints fetch failed:', err.response?.status);
          return { data: { success: false, complaints: [] } };
        }),
        axios.get(`${baseURL}/api/complaints/my/${user?.email}/with-responses?limit=5`, config).catch(err => {
          console.warn('Complaints with responses fetch failed:', err.response?.status);
          return { data: { success: false, complaints: [] } };
        }),
        axios.get(`${baseURL}/api/notifications/unread-count`, config).catch(err => {
          console.warn('Notifications fetch failed:', err.response?.status);
          return { data: { success: false, count: 0 } };
        })
      ]);

      if (bookingsRes.data.success) {
        const bookings = bookingsRes.data.bookings;
        
        // Debug: Log booking data structure
        console.log('Dashboard - Raw booking data:', bookings);
        if (bookings.length > 0) {
          console.log('Dashboard - First booking structure:', Object.keys(bookings[0]));
          console.log('Dashboard - First booking status field:', bookings[0].status);
        }
        
        setRecentBookings(bookings);
        setStats(prev => ({
          ...prev,
          totalBookings: bookings.length,
          activeBookings: bookings.filter(b => {
            const status = b.status || b.courierStatus || b.deliveryStatus;
            return !['Delivered', 'Cancelled', 'Delivery Failed'].includes(status);
          }).length,
          deliveredBookings: bookings.filter(b => {
            const status = b.status || b.courierStatus || b.deliveryStatus;
            return status === 'Delivered';
          }).length
        }));
      }

      // Set notification count
      if (notificationsRes.data.success) {
        setStats(prev => ({
          ...prev,
          unreadNotifications: notificationsRes.data.count || 0
        }));
      }

      if (complaintsRes.data.success) {
        setRecentComplaints(complaintsRes.data.complaints);
      }

      if (complaintsWithResponsesRes.data.success) {
        setComplaintsWithResponses(complaintsWithResponsesRes.data.complaints);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Only redirect on 401 if it's a critical authentication failure
      if (error.response?.status === 401 && error.config?.url?.includes('/bookings/my')) {
        toast.error('Session expired. Please login again.');
        navigate('/customer/login');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.email, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/customer/login');
      return;
    }
    
    fetchDashboardData();
  }, [isAuthenticated, navigate, fetchDashboardData]);

  // Helper function to get status badge styles
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending pickup':
      case 'courier pickup':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'intransit':
      case 'in transit':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'arrived at destination':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'out for delivery':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
      case 'pickup failed':
      case 'delivery failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Helper function to get complaint status badge styles
  const getComplaintStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'pending customer response':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Helper function to get priority badge styles
  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const features = [
    {
      title: 'Book Courier',
      description: 'Send packages quickly and securely',
      icon: 'fas fa-shipping-fast',
      link: '/customer/book-courier',
      color: 'blue-600'
    },
    {
      title: 'Track Parcel',
      description: 'Real-time tracking of your shipments',
      icon: 'fas fa-search-location',
      link: '/customer/track-parcel',
      color: 'purple-600'
    },
    {
      title: 'Booking History',
      description: 'View all your past bookings',
      icon: 'fas fa-history',
      link: '/customer/booking-history',
      color: 'indigo-600'
    },
    {
      title: 'Raise Complaint',
      description: 'Report issues with your shipments',
      icon: 'fas fa-exclamation-triangle',
      link: '/customer/raise-complaint',
      color: 'orange-600'
    },
    {
      title: 'Track Complaint',
      description: 'Check status of your complaints',
      icon: 'fas fa-ticket-alt',
      link: '/customer/track-complaint',
      color: 'red-600'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your courier bookings and track deliveries
              </p>
            </div>
            <Link
              to="/customer/notifications"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <i className="fas fa-bell mr-2"></i>
              Notifications
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <i className="fas fa-box text-blue-600 dark:text-blue-400"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bookings</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <i className="fas fa-clock text-orange-600 dark:text-orange-400"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Bookings</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 dark:text-green-400"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivered</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.deliveredBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <i className="fas fa-bell text-purple-600 dark:text-purple-400"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Notifications</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.unreadNotifications}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Link
                  key={feature.title}
                  to={feature.link}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 bg-${feature.color.split('-')[0]}-100 dark:bg-${feature.color.split('-')[0]}-900/30 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <i className={`${feature.icon} text-${feature.color} dark:text-${feature.color.replace('600', '400')}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {feature.description}
                      </p>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm"></i>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Bookings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Bookings</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {recentBookings.length === 0 ? (
                <div className="p-8 text-center">
                  <i className="fas fa-inbox text-gray-400 text-3xl mb-4"></i>
                  <p className="text-gray-600 dark:text-gray-400">No recent bookings found.</p>
                  <Link
                    to="/customer/book-courier"
                    className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Book Your First Courier
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentBookings.map((booking, index) => (
                    <div key={booking._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {booking.trackingId}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status || booking.courierStatus || booking.deliveryStatus)}`}>
                              {booking.status || booking.courierStatus || booking.deliveryStatus || 'Pending'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            To: {booking.deliveryAddress?.city || 'Unknown'}
                          </p>
                        </div>
                        <Link
                          to={`/customer/track-parcel?id=${booking.trackingId}`}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          Track
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Complaints */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Complaints</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {recentComplaints.length === 0 ? (
                <div className="p-8 text-center">
                  <i className="fas fa-comment-alt text-gray-400 text-3xl mb-4"></i>
                  <p className="text-gray-600 dark:text-gray-400">No recent complaints found.</p>
                  <Link
                    to="/customer/raise-complaint"
                    className="inline-flex items-center mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
                  >
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Raise a Complaint
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentComplaints.map((complaint, index) => (
                    <div key={complaint._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {complaint.ticketNumber}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComplaintStatusBadge(complaint.status)}`}>
                              {complaint.status}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(complaint.priority)}`}>
                              {complaint.priority}
                            </span>
                            {complaint.status === 'In Progress' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                <i className="fas fa-reply mr-1"></i>
                                Response Available
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {complaint.complaintCategory} - {complaint.natureOfComplaint}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Tracking: {complaint.trackingNumber}
                          </p>
                        </div>
                        <Link
                          to={`/customer/track-complaint?ticket=${complaint.ticketNumber}`}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                        >
                          Track
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Admin Responses Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Admin Responses</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {complaintsWithResponses.length === 0 ? (
                <div className="p-8 text-center">
                  <i className="fas fa-comments text-gray-400 text-3xl mb-4"></i>
                  <p className="text-gray-600 dark:text-gray-400">No admin responses yet.</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    When admins respond to your complaints, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {complaintsWithResponses.map((complaint, index) => (
                    <div key={complaint.ticketNumber} className="p-6">
                      {/* Complaint Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            Complaint: {complaint.ticketNumber}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            {complaint.status}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                            {complaint.priority}
                          </span>
                        </div>
                        <Link
                          to={`/customer/track-complaint?ticket=${complaint.ticketNumber}`}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          View Full Details
                        </Link>
                      </div>
                      
                      {/* Complaint Summary */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Category:</strong> {complaint.complaintCategory}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <strong>Issue:</strong> {complaint.natureOfComplaint}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <strong>Tracking:</strong> {complaint.trackingNumber}
                        </p>
                      </div>

                      {/* Admin Responses */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                          <i className="fas fa-reply text-blue-600 mr-2"></i>
                          Admin Responses ({complaint.adminResponses.length})
                        </h4>
                        {complaint.adminResponses.map((response, responseIndex) => (
                          <div key={responseIndex} className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                Admin Response #{responseIndex + 1}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(response.addedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {response.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;