import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../utils/toastUtils';
import axios from 'axios';
import Modal from '../../components/ui/Modal';

const AssignedDeliveries = () => {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const statusFilters = [
    { value: 'all', label: 'All', count: 0 },
    { value: 'pending pickup', label: 'Pending Pickup', count: 0 },
    { value: 'picked up', label: 'Picked Up', count: 0 }
  ];

  useEffect(() => {
    // Check sessionStorage first, then localStorage for backward compatibility
    const token = sessionStorage.getItem('agentToken') || 
                 sessionStorage.getItem('deliveryAgentToken') ||
                 localStorage.getItem('agentToken') || 
                 localStorage.getItem('deliveryAgentToken');
    
    if (!token) {
      console.log('❌ No token found in AssignedDeliveries, redirecting to login');
      navigate('/delivery-agent/login');
      return;
    }
    
    console.log('✅ Token found in AssignedDeliveries, fetching deliveries');
    fetchDeliveries();
  }, [navigate, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDeliveries = async () => {
    try {
      // Check sessionStorage first, then localStorage for backward compatibility
      const token = sessionStorage.getItem('agentToken') || 
                   sessionStorage.getItem('deliveryAgentToken') ||
                   localStorage.getItem('agentToken') || 
                   localStorage.getItem('deliveryAgentToken');
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/assigned-deliveries?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setDeliveries(response.data.data.deliveries);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      if (error.response?.status === 401) {
        navigate('/delivery-agent/login');
      } else {
        showToast.error('Failed to load deliveries');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  

  const handlePickup = async (deliveryId) => {
    try {
      const token = sessionStorage.getItem('agentToken') || 
                   sessionStorage.getItem('deliveryAgentToken') ||
                   localStorage.getItem('agentToken') || 
                   localStorage.getItem('deliveryAgentToken');
      
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/update-status/${deliveryId}`,
        { status: 'picked up' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast.success('Pickup confirmed successfully!');
        fetchDeliveries(); // Refresh the list
      } else {
        showToast.error(response.data.message || 'Failed to confirm pickup');
      }
    } catch (error) {
      console.error('Error confirming pickup:', error);
      showToast.error('An error occurred while confirming pickup.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'picked up':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending pickup':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in transit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'out for delivery':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.refNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading pickups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/delivery-agent/dashboard')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mr-2"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                My Pickup Assignments
              </h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <i className={`fas fa-sync-alt ${refreshing ? 'animate-spin' : ''}`}></i>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by tracking number, recipient..."
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {statusFilters.map((statusFilter) => (
              <button
                key={statusFilter.value}
                onClick={() => setFilter(statusFilter.value)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  filter === statusFilter.value
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                {statusFilter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pickups List */}
      <div className="p-4">
        {filteredDeliveries.length > 0 ? (
          <div className="space-y-4">
            {filteredDeliveries.map((delivery, index) => (
              <motion.div
                key={delivery._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Pickup Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-lg font-semibold text-gray-800 dark:text-white">
                        #{delivery.refNumber}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                      {delivery.status === 'picked up' ? 'Picked Up' : 
                       delivery.status === 'pending pickup' ? 'Pending Pickup' :
                       delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                    </span>
                  </div>
                  
                  {delivery.expectedDeliveryDate && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <i className="fas fa-clock mr-1"></i>
                      Expected: {new Date(delivery.expectedDeliveryDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Pickup Details */}
                <div className="p-4">
                  {/* Pickup Information */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <i className="fas fa-box mr-2 text-orange-500"></i>Pickup From
                    </h4>
                    <div className="bg-orange-50 dark:bg-orange-900 rounded-lg p-3">
                      <p className="font-medium text-gray-800 dark:text-white">{delivery.senderName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.senderAddress}</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <a
                          href={`tel:${delivery.senderContactNumber}`}
                          className="flex items-center text-orange-600 dark:text-orange-400 text-sm hover:text-orange-800 dark:hover:text-orange-200"
                        >
                          <i className="fas fa-phone mr-1"></i>
                          {delivery.senderContactNumber}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Information */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <i className="fas fa-map-marker-alt mr-2 text-green-500"></i>Deliver To
                    </h4>
                    <div className="bg-green-50 dark:bg-green-900 rounded-lg p-3">
                      <p className="font-medium text-gray-800 dark:text-white">{delivery.recipientName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.recipientAddress}</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <a
                          href={`tel:${delivery.recipientContactNumber}`}
                          className="flex items-center text-green-600 dark:text-green-400 text-sm hover:text-green-800 dark:hover:text-green-200"
                        >
                          <i className="fas fa-phone mr-1"></i>
                          {delivery.recipientContactNumber}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Package Information */}
                  <div className="mb-4 bg-blue-50 dark:bg-blue-900 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <i className="fas fa-info-circle mr-2 text-blue-500"></i>Package Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                        <span className="font-medium text-gray-800 dark:text-white ml-1">
                          {delivery.weight || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Type:</span>
                        <span className="font-medium text-gray-800 dark:text-white ml-1">
                          {delivery.packageType || 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    {delivery.status === 'pending pickup' ? (
                      <button
                        onClick={() => handlePickup(delivery._id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                      >
                        <i className="fas fa-check mr-2"></i>
                        Confirm Pickup
                      </button>
                    ) : (
                      <div className="w-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 py-3 px-4 rounded-lg font-medium flex items-center justify-center">
                        <i className="fas fa-check-circle mr-2"></i>
                        Package Picked Up
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-truck text-gray-400 text-3xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              No pickups found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {filter === 'all' 
                ? "You don't have any assigned pickups at the moment."
                : `No pickups with status "${filter}" found.`
              }
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Summary Bar */}
      {filteredDeliveries.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Total: {filteredDeliveries.length} pickups
            </span>
            <div className="flex space-x-4">
              <span className="text-yellow-600 dark:text-yellow-400">
                Pending: {filteredDeliveries.filter(d => d.status === 'pending pickup').length}
              </span>
              <span className="text-green-600 dark:text-green-400">
                Picked Up: {filteredDeliveries.filter(d => d.status === 'picked up').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && selectedDelivery && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-gray-800 dark:text-white">
                    #{selectedDelivery.refNumber}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDelivery.status)}`}>
                  {selectedDelivery.status.charAt(0).toUpperCase() + selectedDelivery.status.slice(1)}
                </span>
              </div>
              {selectedDelivery.expectedDeliveryDate && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <i className="fas fa-clock mr-1"></i>
                  Expected: {new Date(selectedDelivery.expectedDeliveryDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="p-4">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-box mr-2 text-orange-500"></i>Pickup From
                </h4>
                <div className="bg-orange-50 dark:bg-orange-900 rounded-lg p-3">
                  <p className="font-medium text-gray-800 dark:text-white">{selectedDelivery.senderName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedDelivery.senderAddress}</p>
                  <a href={`tel:${selectedDelivery.senderContactNumber}`} className="flex items-center text-orange-600 dark:text-orange-400 text-sm hover:text-orange-800 dark:hover:text-orange-200 mt-2">
                    <i className="fas fa-phone mr-1"></i>
                    {selectedDelivery.senderContactNumber}
                  </a>
                </div>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-map-marker-alt mr-2 text-green-500"></i>Deliver To
                </h4>
                <div className="bg-green-50 dark:bg-green-900 rounded-lg p-3">
                  <p className="font-medium text-gray-800 dark:text-white">{selectedDelivery.recipientName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedDelivery.recipientAddress}</p>
                  <a href={`tel:${selectedDelivery.recipientContactNumber}`} className="flex items-center text-green-600 dark:text-green-400 text-sm hover:text-green-800 dark:hover:text-green-200 mt-2">
                    <i className="fas fa-phone mr-1"></i>
                    {selectedDelivery.recipientContactNumber}
                  </a>
                </div>
              </div>
              <div className="mb-4 bg-blue-50 dark:bg-blue-900 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-info-circle mr-2 text-blue-500"></i>Package Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                    <span className="font-medium text-gray-800 dark:text-white ml-1">{selectedDelivery.weight || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium text-gray-800 dark:text-white ml-1">{selectedDelivery.packageType || 'Standard'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AssignedDeliveries;