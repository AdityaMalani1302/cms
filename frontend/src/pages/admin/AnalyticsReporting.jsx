import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '../../components/ui';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalyticsReporting = () => {
  const [overview, setOverview] = useState({});
  const [courierAnalytics, setCourierAnalytics] = useState({});
  const [complaintAnalytics, setComplaintAnalytics] = useState({});
  // Revenue analytics removed
  const [userAnalytics, setUserAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // Get the auth token from sessionStorage (admin token)
      const token = sessionStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const [overviewRes, courierRes, complaintRes] = await Promise.all([
        axios.get(`${baseURL}/api/analytics/overview?timeRange=${timeRange}`, { headers }),
        axios.get(`${baseURL}/api/analytics/couriers?timeRange=${timeRange}`, { headers }),
        axios.get(`${baseURL}/api/analytics/complaints?timeRange=${timeRange}`, { headers })
        // Revenue analytics API removed
      ]);

      if (overviewRes.data.success) {
        setOverview(overviewRes.data.data.overview);
      }
      if (courierRes.data.success) {
        setCourierAnalytics(courierRes.data.data);
      }
      if (complaintRes.data.success) {
        setComplaintAnalytics(complaintRes.data.data);
      }
      // Revenue analytics processing removed
      
      // Fetch user analytics separately
      try {
        const userRes = await axios.get(`${baseURL}/api/analytics/users?timeRange=${timeRange}`, { headers });
        if (userRes.data.success) {
          setUserAnalytics(userRes.data.data);
        }
      } catch (error) {
        console.log('User analytics not available:', error);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  // getStatusColor function removed - not used

  // Chart color schemes
  const statusChartColors = {
    'Delivered': '#10B981',
    'In Transit': '#3B82F6',
    'Pending': '#F59E0B',
    'Pickup Failed': '#EF4444',
    'Delivery Failed': '#DC2626',
    'Cancelled': '#6B7280',
    'Courier Pickup': '#8B5CF6',
    'Shipped': '#06B6D4'
  };

  const complaintChartColors = {
    'resolved': '#10B981',
    'pending': '#F59E0B',
    'in-progress': '#3B82F6',
    'closed': '#6B7280'
  };

  // Prepare chart data
  const prepareCourierStatusChartData = () => {
    if (!courierAnalytics.statusDistribution) return null;
    
    const labels = courierAnalytics.statusDistribution.map(item => item._id);
    const data = courierAnalytics.statusDistribution.map(item => item.count);
    const backgroundColor = labels.map(label => statusChartColors[label] || '#6B7280');
    
    return {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderColor: backgroundColor.map(color => color + '80'),
        borderWidth: 2,
        hoverOffset: 4
      }]
    };
  };

  const prepareCityDistributionChartData = () => {
    if (!courierAnalytics.cityDistribution) return null;
    
    const sortedCities = courierAnalytics.cityDistribution
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 cities
    
    const labels = sortedCities.map(city => city._id || 'Unknown');
    const data = sortedCities.map(city => city.count);
    
    return {
      labels,
      datasets: [{
        label: 'Packages',
        data,
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
          '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
        ],
        borderColor: [
          '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED',
          '#0891B2', '#65A30D', '#EA580C', '#DB2777', '#4F46E5'
        ],
        borderWidth: 1
      }]
    };
  };

  const prepareComplaintStatusChartData = () => {
    if (!complaintAnalytics.statusDistribution) return null;
    
    const labels = complaintAnalytics.statusDistribution.map(item => item._id);
    const data = complaintAnalytics.statusDistribution.map(item => item.count);
    const backgroundColor = labels.map(label => complaintChartColors[label] || '#6B7280');
    
    return {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderColor: backgroundColor.map(color => color + '80'),
        borderWidth: 2,
        hoverOffset: 4
      }]
    };
  };

  const prepareDailyTrendsChartData = () => {
    if (!courierAnalytics.dailyTrends) return null;
    
    const sortedTrends = courierAnalytics.dailyTrends.sort((a, b) => new Date(a._id) - new Date(b._id));
    const labels = sortedTrends.map(day => 
      new Date(day._id).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    );
    const data = sortedTrends.map(day => day.count);
    
    return {
      labels,
      datasets: [{
        label: 'Packages per Day',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3B82F6',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    };
  };

  // Chart options
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed * 100) / total).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed.y} packages`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analytics & Reporting
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive insights into your courier management system
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
            <button
              onClick={fetchAnalyticsData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Couriers Received</p>
              <p className="text-3xl font-bold">{overview.totalCouriers || 0}</p>
              <p className="text-sm text-blue-100 mt-1">
                {overview.recentCouriers || 0} this period
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-inbox text-2xl"></i>
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
              <p className="text-green-100">Successfully Delivered</p>
              <p className="text-3xl font-bold">{courierAnalytics.statusDistribution?.find(s => s._id === 'Delivered')?.count || 0}</p>
              <p className="text-sm text-green-100 mt-1">
                {overview.successRate || 0}% success rate
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-circle text-2xl"></i>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100">Failed Deliveries</p>
              <p className="text-3xl font-bold">{courierAnalytics.statusDistribution?.find(s => s._id === 'Delivery Failed')?.count || 0}</p>
              <p className="text-sm text-red-100 mt-1">
                {courierAnalytics.statusDistribution?.find(s => s._id === 'Pickup Failed')?.count || 0} pickup failures
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-times-circle text-2xl"></i>
            </div>
          </div>
        </motion.div>

        {/* Revenue metrics removed - payment system disabled */}
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100">Users Joined</p>
              <p className="text-3xl font-bold">{userAnalytics.newUsers || 0}</p>
              <p className="text-sm text-indigo-100 mt-1">
                {userAnalytics.totalLogins || 0} total logins
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-user-plus text-2xl"></i>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Pickup Failures</p>
              <p className="text-3xl font-bold">{courierAnalytics.statusDistribution?.find(s => s._id === 'Pickup Failed')?.count || 0}</p>
              <p className="text-sm text-orange-100 mt-1">
                Requires attention
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100">Total Complaints</p>
              <p className="text-3xl font-bold">{overview.totalComplaints || 0}</p>
              <p className="text-sm text-teal-100 mt-1">
                {complaintAnalytics.statusDistribution?.find(s => s._id === 'resolved')?.count || 0} resolved
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-clipboard-list text-2xl"></i>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Courier Status Distribution - Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Courier Status Distribution
          </h3>
          <div className="h-80">
            {prepareCourierStatusChartData() ? (
              <Doughnut data={prepareCourierStatusChartData()} options={pieChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No data available
              </div>
            )}
          </div>
          {/* Legend with counts */}
          <div className="mt-4 space-y-2">
            {courierAnalytics.statusDistribution?.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: statusChartColors[item._id] || '#6B7280' }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item._id}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Revenue Analysis removed - payment system disabled */}

        {/* City/State-wise Distribution - Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Top 10 Cities - Package Distribution
          </h3>
          <div className="h-80">
            {prepareCityDistributionChartData() ? (
              <Bar data={prepareCityDistributionChartData()} options={barChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Complaint Analysis - Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Complaint Status Distribution
          </h3>
          <div className="h-80">
            {prepareComplaintStatusChartData() ? (
              <Pie data={prepareComplaintStatusChartData()} options={pieChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No data available
              </div>
            )}
          </div>
          {/* Legend with counts */}
          <div className="mt-4 space-y-2">
            {complaintAnalytics.statusDistribution?.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: complaintChartColors[item._id] || '#6B7280' }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item._id}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Daily Trends Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.8 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-8"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Daily Package Trends
        </h3>
        <div className="h-80">
          {prepareDailyTrendsChartData() ? (
            <Bar 
              data={prepareDailyTrendsChartData()} 
              options={{
                ...barChartOptions,
                plugins: {
                  ...barChartOptions.plugins,
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.label}: ${context.parsed.y} packages`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    },
                    title: {
                      display: true,
                      text: 'Number of Packages'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Date'
                    }
                  }
                }
              }} 
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              No trend data available
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsReporting; 