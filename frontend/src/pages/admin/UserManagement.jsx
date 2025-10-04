import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Badge, Button, LoadingSpinner, Input, Modal } from '../../components/ui';
import { showToast } from '../../utils/toastUtils';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsersThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    authProvider: '',
    page: 1,
    limit: 20
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userCouriers, setUserCouriers] = useState([]);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, [filters.search, filters.status, filters.authProvider, filters.page, filters.limit]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('adminToken');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/admin/users`, {
        params: filters,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setUsers(response.data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/admin/users/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      showToast.error('Failed to load user statistics');
    }
  };

  const handleUserClick = async (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
    setLoadingUserDetails(true);
    
    try {
      const token = sessionStorage.getItem('adminToken');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // Fetch detailed user info and courier history
      const [userDetailsRes, userCouriersRes, userComplaintsRes] = await Promise.all([
        axios.get(`${baseURL}/api/admin/users/${user._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => {
          console.warn('User details fetch failed:', err.response?.status);
          return { data: { success: false, data: user } };
        }),
        axios.get(`${baseURL}/api/admin/users/${user._id}/couriers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => {
          console.warn('User couriers fetch failed:', err.response?.status);
          return { data: { success: false, data: [] } };
        }),
        axios.get(`${baseURL}/api/admin/users/${user._id}/complaints`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => {
          console.warn('User complaints fetch failed:', err.response?.status);
          return { data: { success: false, data: [] } };
        })
      ]);
      
      if (userDetailsRes.data.success) {
        const userData = userDetailsRes.data.data;
        // Add counts from API responses, with fallbacks
        userData.courierCount = userCouriersRes.data.success ? userCouriersRes.data.data.length : 0;
        userData.complaintCount = userComplaintsRes.data.success ? userComplaintsRes.data.data.length : 0;
        
        // If specific endpoints failed, try to fetch from general endpoints
        if (!userCouriersRes.data.success || !userComplaintsRes.data.success) {
          try {
            // Fallback: fetch all couriers and filter by user
            if (!userCouriersRes.data.success) {
              const couriersRes = await axios.get(`${baseURL}/api/admin/couriers?userId=${user._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).catch(() => ({ data: { success: false } }));
              
              if (couriersRes.data.success) {
                userData.courierCount = couriersRes.data.data?.length || 0;
              }
            }
            
            // Fallback: fetch all complaints and filter by user
            if (!userComplaintsRes.data.success) {
              const complaintsRes = await axios.get(`${baseURL}/api/admin/complaints?userId=${user._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).catch(() => ({ data: { success: false } }));
              
              if (complaintsRes.data.success) {
                userData.complaintCount = complaintsRes.data.data?.length || 0;
              }
            }
          } catch (fallbackError) {
            console.warn('Fallback fetch failed:', fallbackError);
          }
        }
        
        setSelectedUser(userData);
      }
      
      if (userCouriersRes.data.success) {
        setUserCouriers(userCouriersRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      showToast.error('Failed to load user details');
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.put(`${baseURL}/api/admin/users/${userId}/status`, {
        isActive: !currentStatus
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        fetchUsers();
        fetchUserStats();
        if (selectedUser && selectedUser._id === userId) {
          setSelectedUser(response.data.data);
        }
        showToast.success('User status updated successfully');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      showToast.error('Failed to update user status');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (isActive) => {
    return (
      <Badge 
        variant={isActive ? 'success' : 'destructive'}
        className="text-xs"
      >
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const getProviderBadge = (provider) => {
    const colors = {
      local: 'bg-blue-100 text-blue-800',
      google: 'bg-red-100 text-red-800',
      clerk: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[provider] || colors.local}`}>
        {provider.charAt(0).toUpperCase() + provider.slice(1)}
      </span>
    );
  };

  const statsCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: 'fas fa-users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: 'fas fa-user-check',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Inactive Users',
      value: stats.inactiveUsers,
      icon: 'fas fa-user-times',
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'New This Month',
      value: stats.newUsersThisMonth,
      icon: 'fas fa-user-plus',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
            User Management
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            View and manage customer accounts and their activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <i className={`${stat.icon} ${stat.color} text-xl`}></i>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full"
            />
            
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={filters.authProvider}
              onChange={(e) => setFilters({ ...filters, authProvider: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Providers</option>
              <option value="local">Local</option>
              <option value="google">Google</option>
              <option value="clerk">Clerk</option>
            </select>
            
            <Button onClick={fetchUsers} variant="outline">
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </Button>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" text="Loading users..." />
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-medium text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{user.email}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.phoneNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getProviderBadge(user.authProvider)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.isActive)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserClick(user)}
                        >
                          <i className="fas fa-eye mr-1"></i>
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant={user.isActive ? 'destructive' : 'default'}
                          onClick={() => handleStatusToggle(user._id, user.isActive)}
                        >
                          <i className={`fas ${user.isActive ? 'fa-ban' : 'fa-check'} mr-1`}></i>
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* User Details Modal */}
        <Modal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          title="User Details"
          size="lg"
        >
          {loadingUserDetails ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Loading user details..." />
            </div>
          ) : selectedUser ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{selectedUser.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{selectedUser.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  {getStatusBadge(selectedUser.isActive)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Auth Provider</label>
                  {getProviderBadge(selectedUser.authProvider)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Joined</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>

              {/* Address */}
              {selectedUser.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {[
                      selectedUser.address.street,
                      selectedUser.address.city,
                      selectedUser.address.state,
                      selectedUser.address.pincode,
                      selectedUser.address.country
                    ].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedUser.courierCount || 0}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-300">Total Couriers</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {selectedUser.complaintCount || 0}
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-300">Total Complaints</div>
                </div>
              </div>

              {/* Recent Couriers */}
              {userCouriers.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Recent Couriers
                  </h4>
                  <div className="space-y-2">
                    {userCouriers.slice(0, 5).map((courier) => (
                      <div key={courier._id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {courier.refNumber}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(courier.createdAt)}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {courier.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
};

export default UserManagement;