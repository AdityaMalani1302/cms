import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Dashboard from './DeliveryAgentManagement/Dashboard';
import AddAgent from './DeliveryAgentManagement/AddAgent';
import ManageAgents from './DeliveryAgentManagement/ManageAgents';

const DeliveryAgentManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
    { id: 'add-agent', label: 'Add New Agent', icon: 'fas fa-user-plus' },
    { id: 'manage', label: 'Manage Agents', icon: 'fas fa-users-cog' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Delivery Agent Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage delivery agents and handle pickup assignments
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex space-x-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'add-agent' && <AddAgent />}
          {activeTab === 'manage' && <ManageAgents />}
        </motion.div>
      </div>
    </div>
  );
};

export default DeliveryAgentManagement;