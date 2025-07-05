import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';

const AnalyticsReports = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [kpiData, setKpiData] = useState([]);
  const [selectedReportType, setSelectedReportType] = useState('performance');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    period: 'monthly',
    dateFrom: '',
    dateTo: '',
    branch: ''
  });

  const [branches, setBranches] = useState([]);

  const reportTypes = [
    { id: 'performance', name: 'Performance Report', icon: 'fa-chart-line', color: 'blue' },
    { id: 'revenue', name: 'Revenue Report', icon: 'fa-dollar-sign', color: 'green' },
    { id: 'complaints', name: 'Complaints Report', icon: 'fa-exclamation-triangle', color: 'red' },
    { id: 'geographic', name: 'Geographic Report', icon: 'fa-map-marked-alt', color: 'purple' }
  ];

  const periodOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  useEffect(() => {
    fetchDashboardAnalytics();
    fetchKPIs();
    fetchBranches();
  }, [dateRange]);

  useEffect(() => {
    if (selectedReportType) {
      fetchReportData();
    }
  }, [selectedReportType, dateRange]);

  const fetchDashboardAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams();
      
      Object.entries(dateRange).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/analytics/dashboard?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Fetch dashboard analytics error:', error);
      toast.error('Failed to fetch dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/analytics/kpi?branch=${dateRange.branch}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setKpiData(response.data.data);
      }
    } catch (error) {
      console.error('Fetch KPIs error:', error);
    }
  };

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams();
      
      queryParams.append('reportType', selectedReportType);
      Object.entries(dateRange).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/analytics/reports?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error('Fetch report data error:', error);
      toast.error('Failed to fetch report data');
    }
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/branches`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setBranches(response.data.data);
      }
    } catch (error) {
      console.error('Fetch branches error:', error);
    }
  };

  const handleDateRangeChange = (key, value) => {
    setDateRange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const generateReport = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/analytics/generate`,
        {
          date: new Date().toISOString(),
          type: dateRange.period,
          branch: dateRange.branch
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Analytics generated successfully');
      fetchDashboardAnalytics();
      fetchKPIs();
      fetchReportData();
    } catch (error) {
      console.error('Generate analytics error:', error);
      toast.error('Failed to generate analytics');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent':
        return 'fa-trophy text-green-500';
      case 'good':
        return 'fa-thumbs-up text-blue-500';
      case 'needs_improvement':
        return 'fa-exclamation-triangle text-orange-500';
      default:
        return 'fa-minus text-gray-500';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analytics & Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Comprehensive business intelligence and performance analytics
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateReport}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Generate Report
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Period
              </label>
              <select
                value={dateRange.period}
                onChange={(e) => handleDateRangeChange('period', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Branch
              </label>
              <select
                value={dateRange.branch}
                onChange={(e) => handleDateRangeChange('branch', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch._id} value={branch.branchName}>{branch.branchName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date From
              </label>
              <input
                type="date"
                value={dateRange.dateFrom}
                onChange={(e) => handleDateRangeChange('dateFrom', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date To
              </label>
              <input
                type="date"
                value={dateRange.dateTo}
                onChange={(e) => handleDateRangeChange('dateTo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {kpiData.map((kpi, index) => (
            <motion.div
              key={kpi.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{kpi.name}</h3>
                <i className={`fas ${getStatusIcon(kpi.status)}`}></i>
              </div>
              
              <div className="mb-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {kpi.unit === '₹' ? formatCurrency(kpi.value) : 
                   kpi.unit === '%' ? formatPercentage(kpi.value) : 
                   `${kpi.value}${kpi.unit}`}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className={`${kpi.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpi.growth >= 0 ? '+' : ''}{kpi.growth}%
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {kpi.achievement}% of target
                </span>
              </div>
              
              <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    kpi.achievement >= 100 ? 'bg-green-500' :
                    kpi.achievement >= 80 ? 'bg-blue-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(kpi.achievement, 100)}%` }}
                ></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Report Types */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Report Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportTypes.map((report) => (
              <motion.button
                key={report.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedReportType(report.id)}
                className={`p-6 rounded-xl text-center transition-all duration-300 ${
                  selectedReportType === report.id
                    ? `bg-${report.color}-100 border-2 border-${report.color}-500 text-${report.color}-800`
                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className={`w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center ${
                  selectedReportType === report.id
                    ? `bg-${report.color}-500`
                    : 'bg-gray-400'
                }`}>
                  <i className={`fas ${report.icon} text-white text-xl`}></i>
                </div>
                <h4 className="font-semibold">{report.name}</h4>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Analytics Features Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Advanced Analytics & Business Intelligence
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Comprehensive data analysis and reporting tools for informed decision making
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-chart-bar text-white text-2xl"></i>
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Performance Metrics</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">Track delivery times, success rates, and efficiency</p>
            </div>
            
            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-dollar-sign text-white text-2xl"></i>
              </div>
              <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">Revenue Analytics</h3>
              <p className="text-sm text-green-700 dark:text-green-400">Monitor income trends and profitability</p>
            </div>
            
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-white text-2xl"></i>
              </div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Customer Insights</h3>
              <p className="text-sm text-purple-700 dark:text-purple-400">Analyze customer behavior and satisfaction</p>
            </div>
            
            <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-map-marked-alt text-white text-2xl"></i>
              </div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">Geographic Analysis</h3>
              <p className="text-sm text-orange-700 dark:text-orange-400">Regional performance and coverage mapping</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">Analytics Capabilities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                'Real-time dashboard with live metrics',
                'Customizable KPI tracking and alerts',
                'Advanced filtering and data segmentation',
                'Interactive charts and visualizations',
                'Automated report generation',
                'Export data in multiple formats',
                'Predictive analytics and forecasting',
                'Comparative analysis tools',
                'Time-based trend analysis',
                'Geographic heat mapping',
                'Performance benchmarking',
                'Custom report builder'
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center p-3 bg-white dark:bg-gray-600 rounded-lg"
                >
                  <i className="fas fa-check-circle text-green-500 mr-3 text-lg"></i>
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sample Analytics Data */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">15,240</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Total Deliveries</div>
              <div className="text-xs text-green-600">+12% vs last month</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">₹8.5L</div>
              <div className="text-sm text-green-700 dark:text-green-300">Monthly Revenue</div>
              <div className="text-xs text-green-600">+18% vs last month</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">96.8%</div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Success Rate</div>
              <div className="text-xs text-green-600">+2.1% vs last month</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">4.9/5</div>
              <div className="text-sm text-orange-700 dark:text-orange-300">Customer Rating</div>
              <div className="text-xs text-green-600">+0.3 vs last month</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReports; 