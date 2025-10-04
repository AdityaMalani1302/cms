import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/toastUtils';
import axios from 'axios';

const Notifications = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/customer/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('customerToken');
      const config = {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      const unreadOnly = filter === 'unread';
      const response = await axios.get(`${baseURL}/api/notifications?unreadOnly=${unreadOnly}`, config);

      if (response.data.success) {
        let filteredNotifications = response.data.data;
        
        if (filter === 'read') {
          filteredNotifications = filteredNotifications.filter(n => n.isRead);
        }

        setNotifications(filteredNotifications);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (error.response?.status === 401) {
        showToast.error('Session expired. Please login again.');
        navigate('/customer/login');
      } else {
        showToast.error('Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  }, [filter, navigate]);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      const token = sessionStorage.getItem('customerToken');
      const config = {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      await axios.put(`${baseURL}/api/notifications/${notificationId}/read`, {}, config);
      
      // Update local state
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = sessionStorage.getItem('customerToken');
      const config = {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      await axios.put(`${baseURL}/api/notifications/mark-all-read`, {}, config);
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = sessionStorage.getItem('customerToken');
      const config = {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      await axios.delete(`${baseURL}/api/notifications/${notificationId}`, config);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      showToast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking':
        return 'fas fa-box text-blue-600';
      case 'complaint':
        return 'fas fa-exclamation-circle text-orange-600';
      case 'status_update':
        return 'fas fa-info-circle text-green-600';
      default:
        return 'fas fa-bell text-gray-600';
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = (now - notificationDate) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return notificationDate.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Mark All Read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'read', label: 'Read' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-bell-slash text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : filter === 'read'
                ? "No read notifications found."
                : "You have no notifications yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${
                    notification.isRead 
                      ? 'border-gray-300 dark:border-gray-600' 
                      : 'border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <i className={`${getNotificationIcon(notification.type)} text-xl`}></i>
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold ${
                          notification.isRead 
                            ? 'text-gray-700 dark:text-gray-300' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatDate(notification.createdAt)}</span>
                          {notification.priority === 'high' && (
                            <span className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title="Mark as read"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="Delete notification"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;