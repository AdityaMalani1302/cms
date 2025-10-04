import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../utils/toastUtils';
import axios from 'axios';
import { PasswordInput } from '../../components/ui';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || ''
        }
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put('/api/users/update', formData);
      
      if (response.data.success) {
        showToast.success('Profile updated successfully!');
        // Update sessionStorage with new user data
        const updatedUser = { ...user, ...response.data.user };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        // Update local form data to reflect the changes
        setFormData({
          name: updatedUser.name || '',
          email: updatedUser.email || '',
          phoneNumber: updatedUser.phoneNumber || '',
          address: {
            street: updatedUser.address?.street || '',
            city: updatedUser.address?.city || '',
            state: updatedUser.address?.state || '',
            zipCode: updatedUser.address?.zipCode || ''
          }
        });
      } else {
        showToast.error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showToast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast.error('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.put('/api/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.data.success) {
        showToast.success('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showToast.error(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      showToast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: 'fas fa-user' },
    { id: 'password', label: 'Change Password', icon: 'fas fa-lock' },
    { id: 'settings', label: 'Account Settings', icon: 'fas fa-cog' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
            My Profile
          </h1>
          <p className="text-secondary-600 dark:text-secondary-300">
            Manage your account information and preferences
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-white text-2xl"></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                <p className="text-primary-100">{user?.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-primary-100 text-sm">Active Account</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-secondary-200 dark:border-secondary-700">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200'
                  }`}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <motion.form
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleProfileSubmit}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      name="address.zipCode"
                      value={formData.address.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading && <i className="fas fa-spinner fa-spin"></i>}
                    <span>Update Profile</span>
                  </button>
                </div>
              </motion.form>
            )}

            {activeTab === 'password' && (
              <motion.form
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handlePasswordSubmit}
                className="space-y-6 max-w-md"
              >
                <PasswordInput
                  label="Current Password"
                  name="currentPassword"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your current password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                />

                <PasswordInput
                  label="New Password"
                  name="newPassword"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  helpText="Password must be at least 6 characters long"
                  className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                />

                <PasswordInput
                  label="Confirm New Password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm your new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-700 dark:text-white transition-colors duration-200"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading && <i className="fas fa-spinner fa-spin"></i>}
                    <span>Change Password</span>
                  </button>
                </div>
              </motion.form>
            )}

            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                    Account Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-secondary-800 rounded-lg">
                      <div>
                        <h4 className="font-medium text-secondary-900 dark:text-white">Account Status</h4>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400">Your account is active and verified</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">Active</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white dark:bg-secondary-800 rounded-lg">
                      <div>
                        <h4 className="font-medium text-secondary-900 dark:text-white">Member Since</h4>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <i className="fas fa-calendar-alt text-secondary-400"></i>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white dark:bg-secondary-800 rounded-lg">
                      <div>
                        <h4 className="font-medium text-secondary-900 dark:text-white">Account Type</h4>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400">Customer Account</p>
                      </div>
                      <div className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-medium">
                        Customer
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-4">
                    Logout from Account
                  </h3>
                  <p className="text-red-700 dark:text-red-300 mb-4">
                    Click the button below to securely logout from your account. You will need to login again to access your dashboard.
                  </p>
                  <button
                    onClick={() => logout(navigate)}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile; 