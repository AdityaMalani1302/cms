import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button, LoadingSpinner } from '../../components/ui';

import axios from 'axios';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCouriers: 0,
    totalComplaints: 0,
    totalQueries: 0,
    totalBranches: 0,
    todayDeliveries: 0,
    totalAgents: 0,
    totalUsers: 0,
    unassignedDeliveries: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivities();
    
    // Set up auto-refresh every 30 seconds for real-time data
    const refreshInterval = setInterval(() => {
      fetchDashboardStats();
      fetchRecentActivities();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get authentication token
      const token = sessionStorage.getItem('adminToken') || 
                   sessionStorage.getItem('token') ||
                   localStorage.getItem('adminToken') || 
                   localStorage.getItem('token');

      const apiConfig = {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      };

      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

      // Fetch real stats from backend endpoints
      const [dashboardStatsRes, usersRes, unassignedRes] = await Promise.all([
        axios.get(`${apiBase}/api/admin/dashboard/stats`, apiConfig),
        axios.get(`${apiBase}/api/admin/users/stats`, apiConfig),
        // Fetch unassigned deliveries count
        axios.get(`${apiBase}/api/admin/couriers?status=pending pickup&limit=1`, apiConfig).catch(() => ({ data: { pagination: { totalItems: 0 } } }))
      ]);

      const dashboardData = dashboardStatsRes.data.data;
      const usersData = usersRes.data.data;
      const unassignedCount = unassignedRes.data.pagination?.totalItems || 0;

      setStats({
        totalCouriers: dashboardData.totalCouriers || 0,
        totalComplaints: dashboardData.totalComplaints || 0,
        totalQueries: dashboardData.totalQueries || 0,
        totalAgents: dashboardData.totalAgents || 0,
        todayDeliveries: dashboardData.todayDeliveries || 0,
        totalUsers: usersData.totalUsers || 0,
        unassignedDeliveries: unassignedCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback to zero values if API fails
      setStats({
        totalCouriers: 0,
        totalComplaints: 0,
        totalQueries: 0,
        totalAgents: 0,
        todayDeliveries: 0,
        totalUsers: 0,
        unassignedDeliveries: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const token = sessionStorage.getItem('adminToken') || 
                   sessionStorage.getItem('token') ||
                   localStorage.getItem('adminToken') || 
                   localStorage.getItem('token');

      const apiConfig = {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      };

      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

      // Fetch recent data from multiple sources
      const [couriersRes, complaintsRes, usersRes] = await Promise.all([
        // Recent couriers (last 5)
        axios.get(`${apiBase}/api/admin/couriers?limit=5&sortBy=createdAt&sortOrder=desc`, apiConfig).catch(() => ({ data: { data: [] } })),
        // Recent complaints (last 3)
        axios.get(`${apiBase}/api/admin/complaints?limit=3&sortBy=createdAt&sortOrder=desc`, apiConfig).catch(() => ({ data: { data: [] } })),
        // Recent users (last 3)
        axios.get(`${apiBase}/api/admin/users?limit=3&sortBy=createdAt&sortOrder=desc`, apiConfig).catch(() => ({ data: { data: [] } }))
      ]);

      const activities = [];

      // Process recent couriers
      if (couriersRes.data.data) {
        couriersRes.data.data.forEach(courier => {
          activities.push({
            id: `courier-${courier._id}`,
            type: 'courier',
            icon: 'fas fa-box',
            color: 'blue',
            title: 'New courier booking',
            description: `Tracking #${courier.trackingId || courier.refNumber} created`,
            timestamp: new Date(courier.createdAt)
          });
        });
      }

      // Process recent complaints
      if (complaintsRes.data.data) {
        complaintsRes.data.data.forEach(complaint => {
          activities.push({
            id: `complaint-${complaint._id}`,
            type: 'complaint',
            icon: complaint.status === 'Resolved' ? 'fas fa-check' : 'fas fa-exclamation-circle',
            color: complaint.status === 'Resolved' ? 'green' : 'red',
            title: complaint.status === 'Resolved' ? 'Complaint resolved' : 'New complaint received',
            description: `Ticket #${complaint.ticketNumber} - ${complaint.category}`,
            timestamp: new Date(complaint.createdAt)
          });
        });
      }

      // Process recent users
      if (usersRes.data.data) {
        usersRes.data.data.forEach(user => {
          activities.push({
            id: `user-${user._id}`,
            type: 'user',
            icon: 'fas fa-user-plus',
            color: 'purple',
            title: 'New user registered',
            description: `${user.name} joined the platform`,
            timestamp: new Date(user.createdAt)
          });
        });
      }

      // Sort activities by timestamp (most recent first) and take top 6
      activities.sort((a, b) => b.timestamp - a.timestamp);
      setRecentActivities(activities.slice(0, 6));

    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
    }
  };

  // Helper function to format time ago
  const timeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Helper function to get color classes
  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        iconBg: 'bg-blue-500',
        titleColor: 'text-blue-800 dark:text-blue-300',
        descColor: 'text-blue-600 dark:text-blue-400',
        timeColor: 'text-blue-600 dark:text-blue-400'
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        iconBg: 'bg-green-500',
        titleColor: 'text-green-800 dark:text-green-300',
        descColor: 'text-green-600 dark:text-green-400',
        timeColor: 'text-green-600 dark:text-green-400'
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        iconBg: 'bg-red-500',
        titleColor: 'text-red-800 dark:text-red-300',
        descColor: 'text-red-600 dark:text-red-400',
        timeColor: 'text-red-600 dark:text-red-400'
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        iconBg: 'bg-purple-500',
        titleColor: 'text-purple-800 dark:text-purple-300',
        descColor: 'text-purple-600 dark:text-purple-400',
        timeColor: 'text-purple-600 dark:text-purple-400'
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        iconBg: 'bg-orange-500',
        titleColor: 'text-orange-800 dark:text-orange-300',
        descColor: 'text-orange-600 dark:text-orange-400',
        timeColor: 'text-orange-600 dark:text-orange-400'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  const menuItems = [
    {
      title: 'Manage Couriers',
      description: 'Add, edit, and track courier deliveries',
      icon: 'fas fa-shipping-fast',
      color: 'from-blue-500 to-blue-600',
      href: '/admin/couriers',
      count: stats.totalCouriers
    },
    {
      title: 'User Management',
      description: 'View and manage customer accounts',
      icon: 'fas fa-users',
      color: 'from-green-500 to-green-600',
      href: '/admin/users',
      count: stats.totalUsers
    },
    {
      title: 'Delivery Agents',
      description: 'Manage delivery agents and performance',
      icon: 'fas fa-motorcycle',
      color: 'from-orange-500 to-orange-600',
      href: '/admin/delivery-agents',
      count: stats.totalAgents || 0
    },
    {
      title: 'Allocate Couriers',
      description: 'Assign pickup requests to delivery agents',
      icon: 'fas fa-truck-loading',
      color: 'from-teal-500 to-teal-600',
      href: '/admin/allocate-couriers',
      count: stats.unassignedDeliveries
    },
    {
      title: 'Analytics & Reports',
      description: 'Performance insights and analytics',
      icon: 'fas fa-chart-line',
      color: 'from-indigo-500 to-indigo-600',
      href: '/admin/reports',
      count: null
    },
    {
      title: 'Manage Complaints',
      description: 'View and respond to customer complaints',
      icon: 'fas fa-ticket-alt',
      color: 'from-red-500 to-red-600',
      href: '/admin/complaints',
      count: stats.totalComplaints
    },
    {
      title: 'Customer Queries',
      description: 'View and reply to customer contact messages',
      icon: 'fas fa-envelope',
      color: 'from-purple-500 to-purple-600',
      href: '/admin/queries',
      count: stats.totalQueries || 0
    }
  ];

  const statsCards = [
    {
      title: 'Total Couriers',
      value: stats.totalCouriers,
      icon: 'fas fa-box',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Registered Users',
      value: stats.totalUsers,
      icon: 'fas fa-users',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Active Complaints',
      value: stats.totalComplaints,
      icon: 'fas fa-exclamation-circle',
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Delivery Agents',
      value: stats.totalAgents,
      icon: 'fas fa-motorcycle',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Header Section */}
      <section className="bg-white dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200">
                Welcome back, {user?.adminName || 'Admin'}!
              </h1>
              <p className="text-secondary-600 dark:text-secondary-400 mt-2">
                Here's what's happening with your courier system today.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  fetchDashboardStats();
                  fetchRecentActivities();
                }}
                leftIcon="fas fa-sync-alt"
                disabled={loading}
                className="mr-2"
              >
                Refresh
              </Button>
              <Badge variant="success" size="lg">
                Online
              </Badge>
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center">
                <i className="fas fa-user-shield text-white text-xl"></i>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {statsCards.map((stat, index) => (
              <motion.div key={stat.title} variants={itemVariants}>
                <Card className="p-6 text-center">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <i className={`${stat.icon} ${stat.color} text-xl`}></i>
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-1">
                    {stat.value}
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    {stat.title}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Main Dashboard */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-8">
              <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
                Quick Actions
              </h2>
              <p className="text-secondary-600 dark:text-secondary-400">
                Manage your courier system efficiently
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item, index) => (
                <motion.div key={item.title} variants={itemVariants}>
                  <Card className="p-6 group hover:shadow-2xl transition-all duration-300 cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <i className={`${item.icon} text-white text-xl`}></i>
                      </div>
                      {item.count !== null && (
                        <Badge variant="primary" size="sm">
                          {item.count}
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-secondary-800 dark:text-secondary-200 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                      {item.description}
                    </p>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      rightIcon="fas fa-arrow-right"
                      onClick={() => {
                        // Navigate to implemented pages or show coming soon message
                        if (item.href === '/admin/couriers' || 
                            item.href === '/admin/complaints' || 
                            item.href === '/admin/queries' ||
                            item.href === '/admin/delivery-agents' ||
                            item.href === '/admin/users' ||
                            item.href === '/admin/reports' ||
                            item.href === '/admin/allocate-couriers') {
                          window.location.href = item.href;
                        } else {
                          // Feature will be available in future updates
                          console.log('Feature coming soon:', item.title);
                        }
                      }}
                      className="w-full justify-between"
                    >
                      Access {item.title}
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-secondary-800 dark:text-secondary-200">
                    Recent Activity
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchRecentActivities}
                    leftIcon="fas fa-sync-alt"
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </div>
                <div className="space-y-4">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity) => {
                      const colors = getColorClasses(activity.color);
                      return (
                        <div key={activity.id} className={`flex items-center p-4 ${colors.bg} rounded-xl`}>
                          <div className={`w-10 h-10 ${colors.iconBg} rounded-xl flex items-center justify-center mr-4`}>
                            <i className={`${activity.icon} text-white`}></i>
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold ${colors.titleColor}`}>{activity.title}</p>
                            <p className={`text-sm ${colors.descColor}`}>{activity.description}</p>
                          </div>
                          <div className={`ml-auto text-sm ${colors.timeColor}`}>
                            {timeAgo(activity.timestamp)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
                      <i className="fas fa-clock text-3xl mb-3"></i>
                      <p>No recent activity to display</p>
                      <p className="text-sm">Activities will appear here as they happen</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>
      

    </div>
  );
};

export default AdminDashboard; 