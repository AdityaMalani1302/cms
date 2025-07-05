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
    totalBranches: 0,
    todayDeliveries: 0,
    totalAgents: 0,
    unassignedDeliveries: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // You can create these endpoints in your backend
      const [couriersRes, complaintsRes, branchesRes] = await Promise.all([
        axios.get('/api/courier/stats').catch(() => ({ data: { totalCouriers: 15 } })),
        axios.get('/api/admin/complaints/stats').catch(() => ({ data: { totalComplaints: 8 } })),
        axios.get('/api/branches').catch(() => ({ data: { data: Array(5).fill({}) } }))
      ]);

      setStats({
        totalCouriers: couriersRes.data.totalCouriers || 15,
        totalComplaints: complaintsRes.data.totalComplaints || 8,
        totalBranches: branchesRes.data.data?.length || 5,
        todayDeliveries: 12,
        totalAgents: 0,
        unassignedDeliveries: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
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
      title: 'Delivery Agents',
      description: 'Manage delivery agents and performance',
      icon: 'fas fa-motorcycle',
      color: 'from-orange-500 to-orange-600',
      href: '/admin/delivery-agents',
      count: stats.totalAgents || 0
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
    }
  ];

  const statsCards = [
    {
      title: 'Total Couriers',
      value: stats.totalCouriers,
      icon: 'fas fa-box',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12%'
    },
    {
      title: 'Active Complaints',
      value: stats.totalComplaints,
      icon: 'fas fa-exclamation-circle',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: '-5%'
    },
    {
      title: "Today's Deliveries",
      value: stats.todayDeliveries,
      icon: 'fas fa-truck',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+8%'
    },
    {
      title: 'Delivery Agents',
      value: stats.totalAgents || 0,
      icon: 'fas fa-motorcycle',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '+3'
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
                  <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                    {stat.title}
                  </p>
                  <Badge 
                    variant={stat.change.startsWith('+') ? 'success' : 'warning'}
                    size="sm"
                  >
                    {stat.change}
                  </Badge>
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
                            item.href === '/admin/delivery-agents' ||
                            item.href === '/admin/reports') {
                          window.location.href = item.href;
                        } else {
                          alert('Coming Soon!');
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
                <h3 className="text-xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
                      <i className="fas fa-plus text-white"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800 dark:text-blue-300">New courier added</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Tracking #997614830 created</p>
                    </div>
                    <div className="ml-auto text-sm text-blue-600 dark:text-blue-400">2 hours ago</div>
                  </div>
                  
                  <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mr-4">
                      <i className="fas fa-check text-white"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-300">Complaint resolved</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Ticket #12345 closed successfully</p>
                    </div>
                    <div className="ml-auto text-sm text-green-600 dark:text-green-400">4 hours ago</div>
                  </div>
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