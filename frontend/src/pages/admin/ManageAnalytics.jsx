import React, { useState } from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ManageAnalytics = () => {
  const [timeRange, setTimeRange] = useState('30');

  // Simple static data to avoid any re-rendering issues
  const analyticsData = {
    totalCouriers: 1247,
    totalDelivered: 1156,
    totalInTransit: 68,
    todayDeliveries: 23,
    courierTrends: [
      { date: 'Jun 21', received: 45, sent: 38 },
      { date: 'Jun 22', received: 52, sent: 41 },
      { date: 'Jun 23', received: 38, sent: 35 },
      { date: 'Jun 24', received: 61, sent: 48 },
      { date: 'Jun 25', received: 47, sent: 43 },
      { date: 'Jun 26', received: 55, sent: 46 },
      { date: 'Jun 27', received: 49, sent: 42 }
    ],
    statusDistribution: [
      { status: 'Delivered', count: 456, color: '#10B981' },
      { status: 'In Transit', count: 178, color: '#3B82F6' },
      { status: 'Pickup', count: 89, color: '#F59E0B' },
      { status: 'Failed', count: 23, color: '#EF4444' }
    ],
    cityStats: [
      { city: 'Mumbai', received: 245, sent: 198 },
      { city: 'Delhi', received: 186, sent: 156 },
      { city: 'Bangalore', received: 142, sent: 134 },
      { city: 'Chennai', received: 98, sent: 89 },
      { city: 'Hyderabad', received: 76, sent: 68 },
      { city: 'Pune', received: 65, sent: 58 }
    ],
    monthlyGrowth: [
      { month: 'Jan', couriers: 678, growth: '8.2' },
      { month: 'Feb', couriers: 734, growth: '12.5' },
      { month: 'Mar', couriers: 892, growth: '18.1' },
      { month: 'Apr', couriers: 756, growth: '4.3' },
      { month: 'May', couriers: 823, growth: '11.7' },
      { month: 'Jun', couriers: 934, growth: '15.4' }
    ]
  };

  const StatCard = ({ title, value, icon, color, subtitle, percentage }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 bg-gradient-to-r ${color} rounded-xl shadow-lg relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-white text-sm opacity-90">{title}</p>
          <p className="text-white text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-white text-xs opacity-75">{subtitle}</p>}
          {percentage !== undefined && (
            <p className={`text-sm mt-1 flex items-center ${percentage >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              <i className={`fas fa-arrow-${percentage >= 0 ? 'up' : 'down'} mr-1`}></i>
              {Math.abs(percentage)}% this month
            </p>
          )}
        </div>
        <div className="bg-white bg-opacity-20 p-3 rounded-lg">
          <i className={`${icon} text-white text-2xl`}></i>
        </div>
      </div>
    </motion.div>
  );

  const ChartCard = ({ title, children, className = "" }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <i className="fas fa-chart-bar text-indigo-600 mr-2"></i>
        {title}
      </h3>
      {children}
    </motion.div>
  );

  const CourierTrendsChart = ({ data }) => {
    const maxValue = Math.max(...data.map(d => Math.max(d.received, d.sent)));
    
    return (
      <div className="space-y-4">
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">Received</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">Sent</span>
          </div>
        </div>
        
        <div className="flex items-end justify-between h-64 space-x-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center space-y-2">
              <div className="flex items-end w-full space-x-1 h-48">
                <div className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600 relative group"
                    style={{ height: `${(item.received / maxValue) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.received}
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-green-500 rounded-t transition-all duration-500 hover:bg-green-600 relative group"
                    style={{ height: `${(item.sent / maxValue) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.sent}
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{item.date}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StatusDistributionChart = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;
    
    return (
      <div className="flex items-center justify-center space-x-8">
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="16"
            />
            {data.map((item, index) => {
              const percentage = (item.count / total) * 100;
              const strokeDasharray = `${percentage * 5.02} 502`;
              const strokeDashoffset = -currentAngle * 5.02;
              currentAngle += percentage;
              
              return (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="16"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{item.status}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.count} ({((item.count / total) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MonthlyGrowthChart = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.couriers));
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 300;
      const y = 150 - (item.couriers / maxValue) * 120;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="space-y-4">
        <div className="relative">
          <svg width="100%" height="180" viewBox="0 0 300 180" className="overflow-visible">
            <defs>
              <linearGradient id="growthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polygon
              points={`0,150 ${points} 300,150`}
              fill="url(#growthGradient)"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 300;
              const y = 150 - (item.couriers / maxValue) * 120;
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3B82F6"
                    className="hover:r-6 transition-all cursor-pointer"
                  />
                  <text
                    x={x}
                    y={y - 15}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    {item.couriers}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          {data.map((item, index) => (
            <div key={index} className="text-center">
              <p className="font-medium">{item.month}</p>
              <p className={`text-xs ${parseFloat(item.growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {item.growth > 0 ? '+' : ''}{item.growth}%
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <i className="fas fa-chart-line text-indigo-600 mr-3"></i>
                Analytics & Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Comprehensive courier analytics with interactive charts and performance insights
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                id="timeRange"
                name="timeRange"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Refresh Data
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Couriers"
            value={analyticsData.totalCouriers.toLocaleString()}
            icon="fas fa-box"
            color="from-blue-500 to-blue-600"
            subtitle="All time couriers"
            percentage={12}
          />
          <StatCard
            title="Delivered Successfully"
            value={analyticsData.totalDelivered.toLocaleString()}
            icon="fas fa-check-circle"
            color="from-green-500 to-green-600"
            subtitle="Successful deliveries"
            percentage={8}
          />
          <StatCard
            title="In Transit"
            value={analyticsData.totalInTransit.toLocaleString()}
            icon="fas fa-truck"
            color="from-purple-500 to-purple-600"
            subtitle="Currently shipping"
            percentage={-2}
          />
          <StatCard
            title="Today's Deliveries"
            value={analyticsData.todayDeliveries.toLocaleString()}
            icon="fas fa-calendar-day"
            color="from-orange-500 to-orange-600"
            subtitle="Completed today"
            percentage={15}
          />
        </div>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Daily Courier Trends (Received vs Sent)" className="lg:col-span-2">
            <CourierTrendsChart data={analyticsData.courierTrends} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Courier Status Distribution">
            <StatusDistributionChart data={analyticsData.statusDistribution} />
          </ChartCard>
          <ChartCard title="Monthly Growth Trend">
            <MonthlyGrowthChart data={analyticsData.monthlyGrowth} />
          </ChartCard>
        </div>

        {/* City Statistics and Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <ChartCard title="Top Cities by Volume">
            <div className="space-y-4">
              {analyticsData.cityStats.map((city, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {city.city}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {city.received + city.sent}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500" 
                        style={{ width: `${(city.received / (city.received + city.sent)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-green-500" 
                        style={{ width: `${(city.sent / (city.received + city.sent)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Received: {city.received}</span>
                    <span>Sent: {city.sent}</span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Performance Metrics">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Delivery Success Rate</span>
                <span className="text-sm font-medium text-green-600">94.5%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-500" style={{ width: '94.5%' }}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">On-Time Delivery</span>
                <span className="text-sm font-medium text-blue-600">87.2%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: '87.2%' }}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Customer Satisfaction</span>
                <span className="text-sm font-medium text-purple-600">4.6/5</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="h-2 rounded-full bg-purple-500" style={{ width: '92%' }}></div>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="System Health & Alerts">
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center">
                  <i className="fas fa-check-circle text-green-600 mr-2"></i>
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">System Online</p>
                    <p className="text-xs text-green-600 dark:text-green-400">99.9% uptime</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center">
                  <i className="fas fa-clock text-blue-600 mr-2"></i>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">API Response</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">125ms average</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Active Alerts</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">8 open complaints</p>
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Peak Hours Analysis">
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Courier volume by hour of the day
              </p>
              {[
                { hour: '9-11 AM', volume: 85, color: 'bg-blue-500' },
                { hour: '11-1 PM', volume: 95, color: 'bg-green-500' },
                { hour: '1-3 PM', volume: 75, color: 'bg-yellow-500' },
                { hour: '3-5 PM', volume: 90, color: 'bg-purple-500' },
                { hour: '5-7 PM', volume: 65, color: 'bg-red-500' }
              ].map((period, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span className="text-sm w-16 text-gray-600 dark:text-gray-400">{period.hour}</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${period.color} transition-all duration-500`}
                      style={{ width: `${period.volume}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-8">{period.volume}%</span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Recent Activity Feed">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {[
                { time: '2 mins ago', action: 'New courier registered', type: 'success', icon: 'fa-plus' },
                { time: '5 mins ago', action: 'Delivery completed in Mumbai', type: 'success', icon: 'fa-check' },
                { time: '8 mins ago', action: 'Agent assigned to courier #CMS001245', type: 'info', icon: 'fa-user' },
                { time: '12 mins ago', action: 'Complaint resolved', type: 'success', icon: 'fa-ticket-alt' },
                { time: '15 mins ago', action: 'New branch connection established', type: 'info', icon: 'fa-building' },
                { time: '18 mins ago', action: 'Delivery failed - retry scheduled', type: 'warning', icon: 'fa-exclamation' }
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className={`p-2 rounded-full text-xs ${
                    activity.type === 'success' ? 'bg-green-100 text-green-600' :
                    activity.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <i className={`fas ${activity.icon}`}></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default ManageAnalytics; 