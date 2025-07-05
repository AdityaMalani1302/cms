import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useApi, useCrud } from '../../hooks/useApi';

const AssignmentManager = () => {
  const [activeTab, setActiveTab] = useState('unassigned');
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');

  // Fetch data using custom hooks
  const { data: deliveries, loading, refetch } = useApi(`/api/admin/deliveries?tab=${activeTab}`, {
    transform: (data) => data.data || [],
    immediate: true
  });

  const { data: agents } = useApi('/api/admin/delivery-agents?status=active', {
    transform: (data) => data.data || []
  });

  const { data: stats } = useApi('/api/admin/assignment-stats', {
    transform: (data) => data.data || {}
  });

  const { create: assignDeliveries } = useCrud('/api/admin/assign-deliveries');
  const { update: reassignDelivery } = useCrud('/api/admin/reassign-delivery');

  const handleBulkAssign = async () => {
    if (selectedDeliveries.length === 0) {
      toast.error('Please select deliveries to assign');
      return;
    }
    setShowAssignModal(true);
  };

  const handleAssignToAgent = async () => {
    if (!selectedAgent) {
      toast.error('Please select an agent');
      return;
    }

    try {
      await assignDeliveries({
        deliveryIds: selectedDeliveries,
        agentId: selectedAgent
      });
      
      toast.success(`${selectedDeliveries.length} deliveries assigned successfully`);
      setSelectedDeliveries([]);
      setShowAssignModal(false);
      setSelectedAgent('');
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to assign deliveries');
    }
  };

  const tabs = [
    { key: 'unassigned', label: 'Unassigned', count: stats.unassigned, color: 'red' },
    { key: 'assigned', label: 'Assigned', count: stats.assigned, color: 'blue' },
    { key: 'in-progress', label: 'In Progress', count: stats.inProgress, color: 'yellow' },
    { key: 'completed', label: 'Completed', count: stats.completed, color: 'green' },
    { key: 'delayed', label: 'Delayed', count: stats.delayed, color: 'purple' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Assignment Workflow
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage delivery assignments and track progress
              </p>
            </div>
            {selectedDeliveries.length > 0 && (
              <button
                onClick={handleBulkAssign}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Assign Selected ({selectedDeliveries.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-8 px-6">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full bg-${tab.color}-100 text-${tab.color}-600`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deliveries List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {tabs.find(t => t.key === activeTab)?.label} Deliveries
              </h3>
              {activeTab === 'unassigned' && deliveries.length > 0 && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDeliveries.length === deliveries.length}
                    onChange={() => {
                      if (selectedDeliveries.length === deliveries.length) {
                        setSelectedDeliveries([]);
                      } else {
                        setSelectedDeliveries(deliveries.map(d => d._id));
                      }
                    }}
                    className="mr-2"
                  />
                  Select All
                </label>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {deliveries.map((delivery) => (
              <motion.div
                key={delivery._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {activeTab === 'unassigned' && (
                      <input
                        type="checkbox"
                        checked={selectedDeliveries.includes(delivery._id)}
                        onChange={() => {
                          setSelectedDeliveries(prev =>
                            prev.includes(delivery._id)
                              ? prev.filter(id => id !== delivery._id)
                              : [...prev, delivery._id]
                          );
                        }}
                        className="mr-2"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {delivery.referenceNumber}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {delivery.recipientName} • {delivery.recipientAddress}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          delivery.priority === 'high' ? 'bg-red-100 text-red-600' :
                          delivery.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {delivery.priority} priority
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(delivery.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {delivery.assignedAgent && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {delivery.assignedAgent.agentName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {delivery.assignedAgent.vehicleType}
                        </p>
                      </div>
                    )}

                    <select
                      value={delivery.assignedAgent?._id || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const action = activeTab === 'unassigned' ? assignDeliveries : reassignDelivery;
                          action({ deliveryIds: [delivery._id], agentId: e.target.value }).then(() => {
                            toast.success(`Delivery ${activeTab === 'unassigned' ? 'assigned' : 'reassigned'} successfully`);
                            refetch();
                          });
                        }
                      }}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">{activeTab === 'unassigned' ? 'Assign to...' : 'Reassign to...'}</option>
                      {agents.map(agent => (
                        <option key={agent._id} value={agent._id}>
                          {agent.agentName} ({agent.vehicleType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Assign {selectedDeliveries.length} Deliveries
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Agent
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Choose an agent...</option>
                  {agents.map(agent => (
                    <option key={agent._id} value={agent._id}>
                      {agent.agentName} ({agent.vehicleType}) - {agent.availableCapacity || 0} slots
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignToAgent}
                  disabled={!selectedAgent}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  Assign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssignmentManager; 