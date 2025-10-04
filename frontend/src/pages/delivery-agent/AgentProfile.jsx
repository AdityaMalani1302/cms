import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const AgentProfile = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for branch name
  const [branchName, setBranchName] = useState('Not Assigned');

  // Helper function to fetch branch name by ID
  const fetchBranchName = async (branchId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/branches/${branchId}`);
      if (response.data.success) {
        return response.data.data.branchName;
      }
    } catch (error) {
      console.error('Error fetching branch name:', error);
    }
    return branchId; // Fallback to ID if fetch fails
  };

  // Helper function to format branch name
  const formatBranchName = async (branch) => {
    if (!branch) return 'Not Assigned';
    
    // Check if it looks like an ObjectId (24 character hex string)
    if (typeof branch === 'string' && branch.match(/^[a-f\d]{24}$/i)) {
      const name = await fetchBranchName(branch);
      setBranchName(name);
      return name;
    }
    
    setBranchName(branch);
    return branch;
  };

  useEffect(() => {
    // If user data is available from AuthContext, use it directly
    if (user && user.userType === 'delivery_agent') {
      const loadAgentInfo = async () => {
        const branchDisplay = await formatBranchName(user.assignedBranch || user.branch);
        setAgentInfo({
          name: user.name || user.agentName || 'Delivery Agent',
          agentId: user.agentId || user.id,
          email: user.email || user.agentEmail,
          phoneNumber: user.phoneNumber || user.phone,
          assignedBranch: branchDisplay,
          vehicleType: user.vehicleType,
          isAvailable: user.isAvailable !== undefined ? user.isAvailable : false,
          isActive: user.status === 'active' || user.isActive !== false,
          joinDate: user.joinDate || user.createdAt,
          stats: {
            totalDeliveries: 0,
            successfulDeliveries: 0,
            pendingDeliveries: 0,
            successRate: 0
          }
        });
        setLoading(false);
      };
      loadAgentInfo();
    } else {
      // Fallback to API call if user data not available
      fetchAgentProfile();
    }
  }, [user]);

  const fetchAgentProfile = async () => {
    try {
      // Use sessionStorage instead of localStorage to match AuthContext
      const token = sessionStorage.getItem('agentToken') || sessionStorage.getItem('deliveryAgentToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/profile`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setAgentInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // If profile endpoint doesn't exist, use stored user data as fallback
      if (error.response?.status === 404) {
        // Check sessionStorage first, then localStorage as fallback
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('Using stored user data:', userData); // Debug log
          const loadStoredAgentInfo = async () => {
            const branchDisplay = await formatBranchName(userData.assignedBranch || userData.branch);
            setAgentInfo({
              name: userData.name || userData.agentName || 'Delivery Agent',
              agentId: userData.agentId || userData.id,
              email: userData.email || userData.agentEmail,
              phoneNumber: userData.phoneNumber || userData.phone,
              assignedBranch: branchDisplay,
              vehicleType: userData.vehicleType,
              isAvailable: userData.isAvailable !== undefined ? userData.isAvailable : false,
              isActive: userData.status === 'active' || userData.isActive !== false,
              joinDate: userData.joinDate || userData.createdAt,
              stats: {
                totalDeliveries: 0,
                successfulDeliveries: 0,
                pendingDeliveries: 0,
                successRate: 0
              }
            });
          };
          loadStoredAgentInfo();
          return;
        }
      }
      
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout(navigate);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/delivery-agent/dashboard')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mr-2"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                My Profile
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-white text-2xl"></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{agentInfo?.name}</h2>
                <p className="text-blue-100">Delivery Agent</p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${agentInfo?.isAvailable ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <span className="text-blue-100 text-sm">
                    {agentInfo?.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Agent ID
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {agentInfo?.agentId || 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {agentInfo?.email || 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Phone Number
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {agentInfo?.phoneNumber || 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Assigned Branch
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {branchName}
                  </p>
                </div>

                {agentInfo?.vehicleType && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Vehicle Type
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {agentInfo.vehicleType}
                    </p>
                  </div>
                )}

                {agentInfo?.joinDate && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Join Date
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {new Date(agentInfo.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    agentInfo?.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {agentInfo?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>



            {/* Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex justify-center">
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AgentProfile; 