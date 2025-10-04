import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, LoadingSpinner, Alert, Modal, PasswordInput } from '../../components/ui';
import { showToast } from '../../utils/toastUtils';
import axios from 'axios';

const AdminProfile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    adminName: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    bio: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        adminName: user.adminName || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || 'Administration',
        role: user.role || 'Super Admin',
        bio: user.bio || 'System Administrator for Courier Management System'
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.put('/api/admin/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Update sessionStorage with new admin data
        const updatedUser = { ...user, ...response.data.data };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        // Update local form data to reflect the changes
        setFormData({
          adminName: updatedUser.adminName || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || '',
          department: updatedUser.department || 'Administration',
          role: updatedUser.role || 'Super Admin',
          bio: updatedUser.bio || 'System Administrator for Courier Management System'
        });
        setIsEditing(false);
        showToast.success('Profile updated successfully!');
      }
    } catch (error) {
      showToast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordUpdate = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showToast.error('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast.error('New password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.put('/api/admin/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        showToast.success('Password updated successfully!');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      showToast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-user-shield text-white text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200">
              Admin Profile
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400 mt-2">
              Manage your administrative account settings
            </p>
          </motion.div>

          {alert && (
            <motion.div variants={itemVariants}>
              <Alert 
                type={alert.type} 
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            </motion.div>
          )}

          {/* Profile Information */}
          <motion.div variants={itemVariants}>
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
                  Profile Information
                </h2>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setShowPasswordModal(true)}
                    variant="outline"
                    size="sm"
                  >
                    <i className="fas fa-key mr-2"></i>
                    Change Password
                  </Button>
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    variant={isEditing ? "outline" : "primary"}
                    size="sm"
                  >
                    <i className={`fas ${isEditing ? 'fa-times' : 'fa-edit'} mr-2`}></i>
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Admin Name
                  </label>
                  {isEditing ? (
                    <Input
                      id="adminName"
                      name="adminName"
                      value={formData.adminName}
                      onChange={handleInputChange}
                      placeholder="Enter admin name"
                    />
                  ) : (
                    <p className="text-secondary-800 dark:text-secondary-200 bg-secondary-50 dark:bg-secondary-800 px-3 py-2 rounded-lg">
                      {formData.adminName || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Email Address
                  </label>
                  {isEditing ? (
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                    />
                  ) : (
                    <p className="text-secondary-800 dark:text-secondary-200 bg-secondary-50 dark:bg-secondary-800 px-3 py-2 rounded-lg">
                      {formData.email || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-secondary-800 dark:text-secondary-200 bg-secondary-50 dark:bg-secondary-800 px-3 py-2 rounded-lg">
                      {formData.phone || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Department
                  </label>
                  {isEditing ? (
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="Enter department"
                    />
                  ) : (
                    <p className="text-secondary-800 dark:text-secondary-200 bg-secondary-50 dark:bg-secondary-800 px-3 py-2 rounded-lg">
                      {formData.department}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Role
                  </label>
                  {isEditing ? (
                    <Input
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      placeholder="Enter role"
                    />
                  ) : (
                    <p className="text-secondary-800 dark:text-secondary-200 bg-secondary-50 dark:bg-secondary-800 px-3 py-2 rounded-lg">
                      {formData.role}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Enter bio"
                      rows="3"
                      className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  ) : (
                    <p className="text-secondary-800 dark:text-secondary-200 bg-secondary-50 dark:bg-secondary-800 px-3 py-2 rounded-lg">
                      {formData.bio}
                    </p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-secondary-200 dark:border-secondary-700">
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>

        {/* Password Change Modal */}
        <Modal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          }}
          title="Change Password"
          size="md"
        >
          <div className="space-y-4">
            <PasswordInput
              label="Current Password"
              name="currentPassword"
              id="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter your current password"
              required
              autoComplete="current-password"
            />

            <PasswordInput
              label="New Password"
              name="newPassword"
              id="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter new password (min 6 characters)"
              required
              minLength={6}
              autoComplete="new-password"
              helpText="Password must be at least 6 characters"
            />

            <PasswordInput
              label="Confirm New Password"
              name="confirmPassword"
              id="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Confirm new password"
              required
              minLength={6}
              autoComplete="new-password"
            />

            <div className="flex justify-end space-x-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                disabled={passwordLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordUpdate}
                disabled={passwordLoading}
              >
                {passwordLoading ? <LoadingSpinner size="sm" /> : 'Update Password'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default AdminProfile; 