import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { showToast } from '../../../utils/toastUtils';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    availableAgents: 0,
    inactiveAgents: 0
  });
  const [recentAgents, setRecentAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const [statsRes, agentsRes] = await Promise.all([
        axios.get(`${baseURL}/api/admin/delivery-agents/stats`),
        axios.get(`${baseURL}/api/admin/delivery-agents?limit=5&sort=createdAt:-1`)
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      if (agentsRes.data.success) {
        setRecentAgents(agentsRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Agents</p>
              <p className="text-3xl font-bold">{stats.totalAgents || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-users text-2xl"></i>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Active Agents</p>
              <p className="text-3xl font-bold">{stats.activeAgents || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-user-check text-2xl"></i>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Available Agents</p>
              <p className="text-3xl font-bold">{stats.availableAgents || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-user-clock text-2xl"></i>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Inactive Agents</p>
              <p className="text-3xl font-bold">{stats.inactiveAgents || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-user-times text-2xl"></i>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Agents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Agents
          </h2>
          <div className="space-y-4">
            {recentAgents.map((agent) => (
              <div
                key={agent._id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                    <i className="fas fa-user"></i>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {agent.agentId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    <i className="fas fa-truck mr-1"></i>
                    {agent.vehicleType}
                  </span>
                </div>
              </div>
            ))}
            {recentAgents.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No agents found
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard; 