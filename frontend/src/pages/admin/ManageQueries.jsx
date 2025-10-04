import React, { useState } from 'react';
import { toast } from 'react-toastify';
import DataManager from '../../components/admin/DataManager';
import { queryConfig } from '../../config/adminPageConfigs';
import { Modal } from '../../components/ui';

const ManageQueries = () => {
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleViewMessage = (query) => {
    setSelectedQuery(query);
    setShowViewModal(true);
    
    // Mark as read if unread
    if (query.status === 'unread') {
      markAsRead(query._id);
    }
  };

  const handleReplyClick = (query) => {
    setSelectedQuery(query);
    setShowReplyModal(true);
    
    // Mark as read if unread
    if (query.status === 'unread') {
      markAsRead(query._id);
    }
  };

  const markAsRead = async (queryId) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const token = sessionStorage.getItem('adminToken');
      
      if (!token) {
        console.error('No admin token found');
        return;
      }
      
      console.log('Token length:', token.length, 'Token parts:', token.split('.').length);
      
      const response = await fetch(`${baseURL}/api/admin/queries/${queryId}/read`, {
        method: 'PUT', // Change from PATCH to PUT
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Mark as read failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error marking query as read:', error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    setIsReplying(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const token = sessionStorage.getItem('adminToken');
      
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }
      
      console.log('Sending reply with token parts:', token.split('.').length);
      
      const response = await fetch(`${baseURL}/api/admin/queries/${selectedQuery._id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          replyMessage: replyText
        })
      });

      if (response.ok) {
        toast.success('Reply sent successfully!');
        setShowReplyModal(false);
        setReplyText('');
        setSelectedQuery(null);
        // Refresh the data
        window.location.reload();
      } else {
        const errorData = await response.json().catch(() => null);
        console.error('Reply failed:', response.status, response.statusText, errorData);
        toast.error(errorData?.message || `Failed to send reply (${response.status})`);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleMarkAsRead = async (query) => {
    if (query.status === 'unread') {
      await markAsRead(query._id);
      toast.success('Query marked as read');
      window.location.reload();
    }
  };

  // Create enhanced query config with actions
  const enhancedQueryConfig = {
    ...queryConfig,
    actions: {
      view: {
        label: 'View',
        icon: 'fa-eye',
        className: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
        onClick: handleViewMessage
      },
      reply: {
        label: 'Reply',
        icon: 'fa-reply',
        className: 'bg-green-100 text-green-700 hover:bg-green-200',
        onClick: handleReplyClick
      },
      markRead: {
        label: 'Mark Read',
        icon: 'fa-check-circle',
        className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
        onClick: handleMarkAsRead,
        condition: (item) => item.status === 'unread'
      }
    }
  };

  const formatCellValue = (key, value, item) => {
    switch (key) {
      case 'status':
        const statusColors = {
          'unread': 'bg-yellow-100 text-yellow-800',
          'read': 'bg-blue-100 text-blue-800',
          'replied': 'bg-green-100 text-green-800',
          'pending': 'bg-red-100 text-red-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value] || 'bg-gray-100 text-gray-800'}`}>
            {value?.charAt(0).toUpperCase() + value?.slice(1)}
          </span>
        );
      case 'subject':
        return value || 'General Inquiry';
      case 'createdAt':
        return new Date(value).toLocaleString();
      case 'phone':
        return value || 'N/A';
      default:
        return value;
    }
  };

  return (
    <div className="p-6">
      <DataManager
        config={enhancedQueryConfig}
        formatCellValue={formatCellValue}
      />

      {/* View Message Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedQuery(null);
        }}
        title="View Customer Message"
        size="lg"
      >
        {selectedQuery && (
          <div className="space-y-4">
            {/* Customer Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Name:</label>
                  <p className="text-gray-900 dark:text-white">{selectedQuery.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email:</label>
                  <p className="text-gray-900 dark:text-white">{selectedQuery.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Phone:</label>
                  <p className="text-gray-900 dark:text-white">{selectedQuery.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Received:</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedQuery.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Subject:</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {selectedQuery.subject || 'General Inquiry'}
                </p>
              </div>
            </div>

            {/* Customer Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Message:
              </label>
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedQuery.message}
                </p>
              </div>
            </div>

            {/* Previous Reply (if exists) */}
            {selectedQuery.reply && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Reply:
                </label>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedQuery.reply}
                  </p>
                  {selectedQuery.repliedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Replied on: {new Date(selectedQuery.repliedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setShowReplyModal(true);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center"
              >
                <i className="fas fa-reply mr-2"></i>
                Reply to Customer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reply Modal */}
      <Modal
        isOpen={showReplyModal}
        onClose={() => {
          setShowReplyModal(false);
          setSelectedQuery(null);
          setReplyText('');
        }}
        title="Reply to Customer"
        size="lg"
      >
        {selectedQuery && (
          <div className="space-y-4">
            {/* Customer Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{selectedQuery.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedQuery.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setShowViewModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  <i className="fas fa-eye mr-1"></i>
                  View Full Message
                </button>
              </div>
            </div>

            {/* Previous Reply (if exists) */}
            {selectedQuery.reply && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Previous Reply:
                </label>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 rounded-lg p-3">
                  <p className="text-gray-900 dark:text-white text-sm whitespace-pre-wrap">
                    {selectedQuery.reply}
                  </p>
                  {selectedQuery.repliedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Replied on: {new Date(selectedQuery.repliedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Reply Form */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {selectedQuery.reply ? 'Send Additional Reply:' : 'Send Reply:'}
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder="Type your reply to the customer here..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setSelectedQuery(null);
                  setReplyText('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={isReplying || !replyText.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isReplying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane mr-2"></i>
                    Send Reply
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageQueries;