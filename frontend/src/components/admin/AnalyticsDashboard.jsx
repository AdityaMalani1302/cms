import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('week');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Use custom hooks for data fetching
  const { data: analytics, loading, refetch } = useApi('/api/admin/analytics', {
    transform: (data) => data.data,
    immediate: true
  });

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'dateRange') setDateRange(value);
    if (filterType === 'agent') setSelectedAgent(value);
    if (filterType === 'branch') setSelectedBranch(value);
    
    // Refetch data with new filters
    refetch({ dateRange, agent: selectedAgent, branch: selectedBranch });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Deliveries',
      value: analytics?.overview?.totalDeliveries || 0,
      change: '+12%',
      icon: 'fa-truck',
      color: 'blue'
    },
    {
      title: 'Success Rate',
      value: `${((analytics?.overview?.successfulDeliveries / analytics?.overview?.totalDeliveries) * 100 || 0).toFixed(1)}%`,
      change: '+5%',
      icon: 'fa-check-circle',
      color: 'green'
    },
    {
      title: 'Average Delivery Time',
      value: `${analytics?.overview?.averageDeliveryTime || 0}h`,
      change: '-8%',
      icon: 'fa-clock',
      color: 'yellow'
    },
    {
      title: 'Customer Satisfaction',
      value: `${analytics?.overview?.customerSatisfaction || 0}/5`,
      change: '+3%',
      icon: 'fa-star',
      color: 'purple'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Analytics & Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Insights and performance metrics for your delivery operations
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className={`text-sm ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change} from last period
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <i className={`fas ${stat.icon} text-${stat.color}-600 text-xl`}></i>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <i className="fas fa-file-pdf text-xl mb-2"></i>
              <p className="font-medium">Generate PDF Report</p>
            </button>
            <button className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <i className="fas fa-file-excel text-xl mb-2"></i>
              <p className="font-medium">Export to Excel</p>
            </button>
            <button className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <i className="fas fa-chart-line text-xl mb-2"></i>
              <p className="font-medium">View Detailed Charts</p>
            </button>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Agents</h3>
            <div className="space-y-3">
              {analytics?.performance?.topAgents?.slice(0, 5).map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 dark:text-white">{agent.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{agent.deliveries} deliveries</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{agent.successRate}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                  </div>
                </div>
              )) || <p className="text-gray-500">No data available</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">City-wise Performance</h3>
            <div className="space-y-3">
              {analytics?.geographical?.cityWiseDeliveries?.slice(0, 5).map((city, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{city.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{city.deliveries} deliveries</p>
                  </div>
                  <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(city.deliveries / (analytics?.overview?.totalDeliveries || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )) || <p className="text-gray-500">No data available</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 