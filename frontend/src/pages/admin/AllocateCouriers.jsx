import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Card, Button, LoadingSpinner } from '../../components/ui';
import axios from 'axios';

const AllocateCouriers = () => {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('adminToken');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

      console.log('🔑 Admin token:', token ? 'present' : 'missing');
      console.log('🌐 API Base URL:', baseURL);

      if (!token) {
        toast.error('No admin token found. Please login again.');
        return;
      }

      const [bookingsRes, agentsRes] = await Promise.all([
        axios.get(`${baseURL}/api/bookings/admin/all`, {
          params: { 
            status: 'pending pickup', 
            unassigned: true 
          }
          // Temporarily removed auth headers for testing
          // headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseURL}/api/delivery-agent/available`, {
          // Temporarily removed auth headers for testing
          // headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (bookingsRes.data.success) {
        setPendingBookings(bookingsRes.data.data || []);
      }

      if (agentsRes.data.success) {
        setAvailableAgents(agentsRes.data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignment = async (bookingId, agentId) => {
    try {
      setAssigning(true);
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

      const response = await axios.post(`${baseURL}/api/delivery-agent/allocate`, {
        agentId,
        courierIds: [bookingId]
      }, {
        // Temporarily removed auth headers for testing
        // headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Courier allocated successfully!');
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error allocating courier:', error);
      toast.error(error.response?.data?.message || 'Failed to allocate courier');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Allocate Couriers
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Assign pending pickup requests to available delivery agents
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Pickup Requests */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pending Pickup Requests ({pendingBookings.length})
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pendingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
                  <p className="text-gray-500 dark:text-gray-400">
                    No pending pickup requests
                  </p>
                </div>
              ) : (
                pendingBookings.map(booking => (
                  <motion.div
                    key={booking._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {booking.trackingId}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {booking.packageType} - {booking.weight}kg
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                        {booking.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <i className="fas fa-map-marker-alt w-4 mr-2"></i>
                        <span>From: {booking.pickupAddress?.street}, {booking.pickupAddress?.city}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <i className="fas fa-flag w-4 mr-2"></i>
                        <span>To: {booking.deliveryAddress?.street}, {booking.deliveryAddress?.city}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <i className="fas fa-user w-4 mr-2"></i>
                        <span>Customer: {booking.userId?.name}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assign to Agent:
                      </label>
                      <div className="flex space-x-2">
                        <select
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignment(booking._id, e.target.value);
                            }
                          }}
                          disabled={assigning}
                        >
                          <option value="">Select Agent</option>
                          {availableAgents.map(agent => (
                            <option key={agent._id} value={agent._id}>
                              {agent.name} ({agent.agentId})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>

          {/* Available Agents */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Available Agents ({availableAgents.length})
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {availableAgents.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-user-slash text-red-500 text-4xl mb-4"></i>
                  <p className="text-gray-500 dark:text-gray-400">
                    No available agents
                  </p>
                </div>
              ) : (
                availableAgents.map(agent => (
                  <motion.div
                    key={agent._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {agent.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {agent.agentId}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {agent.vehicleType || 'Vehicle not specified'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                          Available
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {agent.activeDeliveries || 0} active deliveries
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={fetchData}
            disabled={loading}
            leftIcon="fas fa-sync-alt"
            variant="outline"
          >
            Refresh Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AllocateCouriers;