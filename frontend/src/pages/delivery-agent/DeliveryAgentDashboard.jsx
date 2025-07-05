import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const DeliveryAgentDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const handleLogout = useCallback(() => {
    // Clear all possible token storage keys
    localStorage.removeItem('agentToken');
    localStorage.removeItem('deliveryAgentToken');
    localStorage.removeItem('user');
    localStorage.removeItem('deliveryAgentInfo');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/delivery-agent/login');
  }, [navigate]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('agentToken') || localStorage.getItem('deliveryAgentToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        handleLogout();
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    // Check if user is logged in (support both new and legacy token names)
    const token = localStorage.getItem('agentToken') || localStorage.getItem('deliveryAgentToken');
    const info = localStorage.getItem('user') || localStorage.getItem('deliveryAgentInfo');
    
    if (!token || !info) {
      navigate('/delivery-agent/login');
      return;
    }

    const agentData = JSON.parse(info);
    setAgentInfo(agentData);
    setIsAvailable(agentData.isAvailable);
    fetchDashboardData();
  }, [navigate, fetchDashboardData]);

  const toggleAvailability = async () => {
    try {
      const token = localStorage.getItem('agentToken') || localStorage.getItem('deliveryAgentToken');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/availability`,
        { isAvailable: !isAvailable },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setIsAvailable(!isAvailable);
        toast.success(`You are now ${!isAvailable ? 'available' : 'unavailable'} for deliveries`);
        
        // Update stored agent info (support both storage methods)
        const updatedInfo = { ...agentInfo, isAvailable: !isAvailable };
        setAgentInfo(updatedInfo);
        localStorage.setItem('user', JSON.stringify(updatedInfo));
        // Also update legacy storage for backward compatibility
        localStorage.setItem('deliveryAgentInfo', JSON.stringify(updatedInfo));
      }
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Out for Delivery':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Intransit':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Pickup Failed':
      case 'Delivery Failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                <i className="fas fa-truck text-white"></i>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Welcome, {agentInfo?.name}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Agent ID: {agentInfo?.agentId} • {agentInfo?.assignedBranch}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Availability Toggle */}
              <button
                onClick={toggleAvailability}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isAvailable
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}
              >
                {isAvailable ? 'Available' : 'Unavailable'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-clipboard-list text-blue-600 dark:text-blue-400 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {dashboardData?.stats.assignedDeliveries || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Deliveries</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {dashboardData?.stats.completedToday || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed Today</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-trophy text-purple-600 dark:text-purple-400 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {dashboardData?.stats.successRate || 0}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-boxes text-orange-600 dark:text-orange-400 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {dashboardData?.stats.totalDeliveries || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Deliveries</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/delivery-agent/assignments')}
              className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
            >
              <div className="text-center">
                <i className="fas fa-list text-blue-600 dark:text-blue-400 text-2xl mb-2"></i>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">View Assignments</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/delivery-agent/scan')}
              className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
            >
              <div className="text-center">
                <i className="fas fa-qrcode text-green-600 dark:text-green-400 text-2xl mb-2"></i>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Scan Package</p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Recent Deliveries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Deliveries</h3>
            <button
              onClick={() => navigate('/delivery-agent/assignments')}
              className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-800 dark:hover:text-blue-200"
            >
              View All
            </button>
          </div>

          {dashboardData?.recentDeliveries?.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recentDeliveries.slice(0, 5).map((delivery, index) => (
                <div
                  key={delivery._id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-800 dark:text-white text-sm">
                        #{delivery.refNumber}
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                        {delivery.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {delivery.recipientName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                      {delivery.recipientAddress}
                    </p>
                  </div>
                  <button className="ml-3 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-truck text-gray-400 text-4xl mb-3"></i>
              <p className="text-gray-600 dark:text-gray-400">No recent deliveries</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DeliveryAgentDashboard; 