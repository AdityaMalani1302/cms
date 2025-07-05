import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const AssignedDeliveries = () => {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const statusFilters = [
    { value: 'all', label: 'All', count: 0 },
    { value: 'Intransit', label: 'In Transit', count: 0 },
    { value: 'Out for Delivery', label: 'Out for Delivery', count: 0 },
    { value: 'Pickup', label: 'Pickup', count: 0 }
  ];

  useEffect(() => {
    const token = localStorage.getItem('agentToken') || localStorage.getItem('deliveryAgentToken');
    if (!token) {
      navigate('/delivery-agent/login');
      return;
    }
    fetchDeliveries();
  }, [navigate, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDeliveries = async () => {
    try {
      const token = localStorage.getItem('agentToken') || localStorage.getItem('deliveryAgentToken');
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
        toast.error('Failed to load deliveries');
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

  const handleStatusUpdate = async (deliveryId, newStatus, additionalData = {}) => {
    try {
      const token = localStorage.getItem('agentToken') || localStorage.getItem('deliveryAgentToken');
      const endpoint = newStatus === 'Delivered' 
        ? `/api/delivery-agent/delivery/${deliveryId}`
        : `/api/delivery-agent/status/${deliveryId}`;
      
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${endpoint}`,
        {
          status: newStatus,
          remark: additionalData.remark || `Status updated to ${newStatus}`,
          ...additionalData
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success(`Package ${newStatus.toLowerCase()} successfully!`);
        fetchDeliveries();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Out for Delivery':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Intransit':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Pickup':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (attempts) => {
    if (attempts >= 2) return 'text-red-500';
    if (attempts >= 1) return 'text-orange-500';
    return 'text-green-500';
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
          <p className="text-gray-600 dark:text-gray-400">Loading deliveries...</p>
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
                My Deliveries
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

      {/* Deliveries List */}
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
                {/* Delivery Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-lg font-semibold text-gray-800 dark:text-white">
                        #{delivery.refNumber}
                      </span>
                      {delivery.deliveryAttempts > 0 && (
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(delivery.deliveryAttempts)} bg-gray-100 dark:bg-gray-700`}>
                          Attempt {delivery.deliveryAttempts + 1}
                        </span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                      {delivery.status}
                    </span>
                  </div>
                  
                  {delivery.expectedDeliveryDate && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <i className="fas fa-clock mr-1"></i>
                      Expected: {new Date(delivery.expectedDeliveryDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Delivery Details */}
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
                        {delivery.senderEmail && (
                          <a
                            href={`mailto:${delivery.senderEmail}`}
                            className="flex items-center text-orange-600 dark:text-orange-400 text-sm hover:text-orange-800 dark:hover:text-orange-200"
                          >
                            <i className="fas fa-envelope mr-1"></i>
                            Email
                          </a>
                        )}
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
                        {delivery.recipientEmail && (
                          <a
                            href={`mailto:${delivery.recipientEmail}`}
                            className="flex items-center text-green-600 dark:text-green-400 text-sm hover:text-green-800 dark:hover:text-green-200"
                          >
                            <i className="fas fa-envelope mr-1"></i>
                            Email
                          </a>
                        )}
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
                      {delivery.specialInstructions && (
                        <div className="col-span-2">
                          <span className="text-gray-600 dark:text-gray-400">Instructions:</span>
                          <p className="text-gray-800 dark:text-white mt-1">
                            {delivery.specialInstructions}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    {delivery.status === 'Pickup' && (
                      <button
                        onClick={() => handleStatusUpdate(delivery._id, 'Intransit')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        <i className="fas fa-check mr-2"></i>
                        Collected
                      </button>
                    )}

                    {delivery.status === 'Intransit' && (
                      <button
                        onClick={() => handleStatusUpdate(delivery._id, 'Out for Delivery')}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        <i className="fas fa-truck mr-2"></i>
                        Out for Delivery
                      </button>
                    )}

                    {delivery.status === 'Out for Delivery' && (
                      <button
                        onClick={() => navigate(`/delivery-agent/deliver/${delivery._id}`)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        <i className="fas fa-hand-holding-heart mr-2"></i>
                        Deliver Package
                      </button>
                    )}

                    {/* QR Code Scanner */}
                    <button
                      onClick={() => navigate(`/delivery-agent/scan?deliveryId=${delivery._id}`)}
                      className="px-3 py-2 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                      title="Scan QR Code"
                    >
                      <i className="fas fa-qrcode"></i>
                    </button>

                    {/* Navigation */}
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(delivery.recipientAddress)}`, '_blank')}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="Navigate"
                    >
                      <i className="fas fa-directions"></i>
                    </button>
                  </div>

                  {/* Report Issue Button */}
                  <button
                    onClick={() => navigate(`/delivery-agent/report-issue/${delivery._id}`)}
                    className="w-full mt-2 py-2 px-4 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                  >
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Report Issue
                  </button>
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
              No deliveries found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {filter === 'all' 
                ? "You don't have any assigned deliveries at the moment."
                : `No deliveries with status "${filter}" found.`
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
              Total: {filteredDeliveries.length} deliveries
            </span>
            <div className="flex space-x-4">
              <span className="text-yellow-600 dark:text-yellow-400">
                Pending: {filteredDeliveries.filter(d => d.status !== 'Delivered').length}
              </span>
              <span className="text-green-600 dark:text-green-400">
                Completed: {filteredDeliveries.filter(d => d.status === 'Delivered').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedDeliveries; 