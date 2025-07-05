import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import moment from 'moment';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications/my');
      
      if (response.data.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      toast.error('Error fetching notifications');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/mark-all-read');
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Error marking notifications as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'Booking':
        return 'fas fa-box';
      case 'Delivery':
        return 'fas fa-truck';
      case 'Complaint':
        return 'fas fa-exclamation-triangle';
      case 'Payment':
        return 'fas fa-credit-card';
      case 'System':
        return 'fas fa-cog';
      default:
        return 'fas fa-bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'Booking':
        return 'text-blue-600';
      case 'Delivery':
        return 'text-green-600';
      case 'Complaint':
        return 'text-red-600';
      case 'Payment':
        return 'text-yellow-600';
      case 'System':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.isRead;
    return notification.type === filter;
  });

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
      <section className="relative gradient-bg-info overflow-hidden py-16">
        <div className="absolute inset-0 hero-pattern"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <i className="fas fa-bell text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-display mb-4">
              Notifications
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Stay updated with all your courier and complaint status changes
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Filters and Actions */}
            <motion.div variants={itemVariants}>
              <div className="card-elevated p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
                      Your Notifications
                    </h2>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {notifications.filter(n => !n.isRead).length} unread of {notifications.length} total
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="input-field text-sm w-full sm:w-auto"
                    >
                      <option value="all">All Notifications</option>
                      <option value="unread">Unread Only</option>
                      <option value="Booking">Booking Updates</option>
                      <option value="Delivery">Delivery Updates</option>
                      <option value="Complaint">Complaint Updates</option>
                      <option value="Payment">Payment Updates</option>
                      <option value="System">System Updates</option>
                    </select>

                    <button
                      onClick={markAllAsRead}
                      className="btn-outline-primary text-sm"
                    >
                      <i className="fas fa-check-double mr-2"></i>
                      Mark All Read
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Notifications List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <motion.div variants={itemVariants} className="card-elevated p-12 text-center">
                <div className="w-24 h-24 bg-secondary-100 dark:bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-bell-slash text-secondary-400 text-3xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
                  No Notifications
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  {filter === 'unread' 
                    ? "You have no unread notifications"
                    : "You don't have any notifications yet"}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification._id}
                    variants={itemVariants}
                    className={`card-elevated p-6 hover:shadow-lg transition-all duration-300 cursor-pointer ${
                      !notification.isRead ? 'border-l-4 border-primary-500 bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification._id)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        !notification.isRead 
                          ? 'bg-primary-100 dark:bg-primary-900' 
                          : 'bg-secondary-100 dark:bg-secondary-700'
                      }`}>
                        <i className={`${getNotificationIcon(notification.type)} ${getNotificationColor(notification.type)} text-lg`}></i>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold ${
                              !notification.isRead 
                                ? 'text-secondary-900 dark:text-white' 
                                : 'text-secondary-700 dark:text-secondary-300'
                            }`}>
                              {notification.title}
                            </h3>
                            <p className={`text-sm mt-1 ${
                              !notification.isRead 
                                ? 'text-secondary-700 dark:text-secondary-300' 
                                : 'text-secondary-600 dark:text-secondary-400'
                            }`}>
                              {notification.message}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.isRead && (
                              <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              notification.type === 'Booking' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              notification.type === 'Delivery' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              notification.type === 'Complaint' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              notification.type === 'Payment' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {notification.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <p className="text-xs text-secondary-500 dark:text-secondary-400">
                            {moment(notification.createdAt).fromNow()}
                          </p>

                          {/* Action buttons based on notification type */}
                          {notification.relatedBookingId && (
                            <a
                              href={`/customer/track-parcel?id=${notification.relatedTrackingId || ''}`}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <i className="fas fa-external-link-alt mr-1"></i>
                              Track Package
                            </a>
                          )}

                          {notification.type === 'Complaint' && (
                            <a
                              href="/customer/track-complaint"
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <i className="fas fa-external-link-alt mr-1"></i>
                              View Complaint
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 text-center">
                  <i className="fas fa-bolt text-primary-600 mr-2"></i>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a
                    href="/customer/book-courier"
                    className="block p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors duration-200 text-center"
                  >
                    <i className="fas fa-shipping-fast text-blue-600 text-2xl mb-2"></i>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-1">Book Courier</h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">Send a new package</p>
                  </a>
                  
                  <a
                    href="/customer/track-parcel"
                    className="block p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-colors duration-200 text-center"
                  >
                    <i className="fas fa-search-location text-green-600 text-2xl mb-2"></i>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-1">Track Package</h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">Check delivery status</p>
                  </a>
                  
                  <a
                    href="/customer/support"
                    className="block p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-colors duration-200 text-center"
                  >
                    <i className="fas fa-headset text-purple-600 text-2xl mb-2"></i>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-1">Get Support</h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">Contact our team</p>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Notifications; 