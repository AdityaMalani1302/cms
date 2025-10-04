import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { LoadingSpinner } from '../../components/ui';

const AdminRecovery = () => {
  const [loading, setLoading] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [formData, setFormData] = useState({
    masterKey: '',
    adminUsername: '',
    newPassword: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.masterKey.trim()) {
      toast.error('Master recovery key is required');
      return;
    }
    
    if (!formData.adminUsername.trim()) {
      toast.error('Admin username is required');
      return;
    }
    
    if (!formData.newPassword.trim()) {
      toast.error('New password is required');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      const response = await axios.post(`${baseURL}/api/auth/admin-recovery`, {
        masterKey: formData.masterKey.trim(),
        adminUsername: formData.adminUsername.trim(),
        newPassword: formData.newPassword
      });

      if (response.data.success) {
        toast.success('Admin password reset successfully! You can now login.');
        setTimeout(() => {
          navigate('/admin/login');
        }, 2000);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Admin recovery error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to reset admin password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-key text-red-600 text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Recovery
            </h2>
            <p className="text-gray-600">
              Use master recovery key to reset admin password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Master Recovery Key */}
            <div>
              <label htmlFor="masterKey" className="block text-sm font-medium text-gray-700 mb-2">
                Master Recovery Key
              </label>
              <div className="relative">
                <input
                  id="masterKey"
                  name="masterKey"
                  type={showMasterKey ? "text" : "password"}
                  value={formData.masterKey}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter master recovery key"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterKey(!showMasterKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                >
                  <i className={`fas ${showMasterKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Admin Username */}
            <div>
              <label htmlFor="adminUsername" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Username
              </label>
              <input
                id="adminUsername"
                name="adminUsername"
                type="text"
                value={formData.adminUsername}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter admin username"
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter new password (min 8 characters)"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Confirm new password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Resetting Password...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-unlock-alt mr-2"></i>
                  Reset Admin Password
                </>
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center">
              <Link
                to="/admin/login"
                className="text-red-600 hover:text-red-500 text-sm"
              >
                ← Back to Admin Login
              </Link>
            </div>
          </form>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-semibold mb-2">
            <i className="fas fa-info-circle mr-2"></i>
            Recovery Instructions
          </h3>
          <div className="text-yellow-700 text-sm space-y-1">
            <p>• The master recovery key is set in environment variables</p>
            <p>• Default key for academic demo: <code className="bg-yellow-100 px-1 rounded">academic-demo-key-2024</code></p>
            <p>• Contact system administrator if you don't have the key</p>
            <p>• This feature is for emergency access only</p>
          </div>
        </div>

        {/* Alternative Recovery */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-semibold mb-2">
            <i className="fas fa-tools mr-2"></i>
            Alternative Recovery
          </h3>
          <div className="text-blue-700 text-sm space-y-2">
            <p>If you don't have the master key, you can use the database reset script:</p>
            <code className="block bg-blue-100 p-2 rounded text-xs">
              cd backend<br/>
              node scripts/resetAdminPassword.js admin newpassword123
            </code>
          </div>
        </div>

        {/* Academic Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm">
            <i className="fas fa-graduation-cap mr-2"></i>
            <strong>Academic Project:</strong> This recovery system is designed for educational purposes and includes multiple recovery methods for demonstration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminRecovery;