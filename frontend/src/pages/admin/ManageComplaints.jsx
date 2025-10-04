import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Input, LoadingSpinner, Alert, Badge, Modal } from '../../components/ui';
import { showToast } from '../../utils/toastUtils';
import axios from 'axios';

const ManageComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseLoading, setResponseLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });

  const fetchComplaints = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/admin/complaints`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setComplaints(response.data.data);
        calculateStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      if (error.response?.status === 401) {
        showToast.error('Authentication failed. Please login again.');
      } else {
        showToast.error('Failed to fetch complaints');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
    // Set up real-time updates
    const interval = setInterval(fetchComplaints, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchComplaints]);

  const calculateStats = (complaintsData) => {
    const stats = {
      total: complaintsData.length,
      open: complaintsData.filter(c => c.status === 'Open').length,
      inProgress: complaintsData.filter(c => c.status === 'In Progress').length,
      resolved: complaintsData.filter(c => c.status === 'Resolved').length,
      closed: complaintsData.filter(c => c.status === 'Closed').length
    };
    setStats(stats);
  };

  const handleViewComplaint = (complaint) => {
    setSelectedComplaint(complaint);
  };

  const handleRespondToComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setShowResponseModal(true);
    setResponseText('');
  };

  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.put(`${baseURL}/api/admin/complaints/${complaintId}`, {
        status: newStatus,
        updationDate: new Date()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        showToast.success('Status updated successfully');
        fetchComplaints(); // Refresh the list
      }
    } catch (error) {
      showToast.error('Failed to update status');
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) {
      showToast.error('Please enter a response');
      return;
    }

    setResponseLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      console.log('Sending response for complaint:', selectedComplaint._id);
      console.log('Response text:', responseText);
      
      const response = await axios.put(`${baseURL}/api/admin/complaints/${selectedComplaint._id}/respond`, {
        responseText: responseText,
        status: 'In Progress'
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response received:', response.data);

      if (response.data.success) {
        showToast.success('Response sent successfully! The customer will be notified.');
        setShowResponseModal(false);
        setSelectedComplaint(null);
        setResponseText('');
        fetchComplaints(); // Refresh the list
      } else {
        showToast.error(response.data.message || 'Failed to send response');
      }
    } catch (error) {
      console.error('Error sending response:', error);
      showToast.error(error.response?.data?.message || 'Failed to send response. Please try again.');
    } finally {
      setResponseLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = complaint.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.natureOfComplaint?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading complaints..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center">
            <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200">
              Manage Complaints
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400 mt-2">
              View and respond to customer complaints with real-time tracking
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

          {/* Statistics Cards */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card className="p-4 text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <i className="fas fa-ticket-alt text-blue-600"></i>
                </div>
                <p className="text-2xl font-bold text-secondary-800 dark:text-secondary-200">{stats.total}</p>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Total</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <i className="fas fa-exclamation-circle text-red-600"></i>
                </div>
                <p className="text-2xl font-bold text-secondary-800 dark:text-secondary-200">{stats.open}</p>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Open</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <i className="fas fa-clock text-yellow-600"></i>
                </div>
                <p className="text-2xl font-bold text-secondary-800 dark:text-secondary-200">{stats.inProgress}</p>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">In Progress</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <i className="fas fa-check-circle text-green-600"></i>
                </div>
                <p className="text-2xl font-bold text-secondary-800 dark:text-secondary-200">{stats.resolved}</p>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Resolved</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <i className="fas fa-times-circle text-gray-600"></i>
                </div>
                <p className="text-2xl font-bold text-secondary-800 dark:text-secondary-200">{stats.closed}</p>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Closed</p>
              </Card>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    id="complaintSearch"
                    name="complaintSearch"
                    placeholder="Search by ticket number, tracking number, or complaint..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon="fas fa-search"
                  />
                </div>
                <div className="w-full md:w-48">
                  <select
                    id="statusFilter"
                    name="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Complaints List */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50 dark:bg-secondary-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Ticket ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Tracking Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Nature of Complaint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-secondary-900 divide-y divide-secondary-200 dark:divide-secondary-700">
                    <AnimatePresence>
                      {filteredComplaints.map((complaint, index) => (
                        <motion.tr
                          key={complaint._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 dark:text-secondary-100">
                            {complaint.ticketNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700 dark:text-secondary-300">
                            {complaint.trackingNumber}
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-300">
                            <div className="max-w-xs truncate">
                              {complaint.natureOfComplaint}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getPriorityColor(complaint.priority)}>
                              {complaint.priority || 'Medium'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(complaint.status)}>
                              {complaint.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700 dark:text-secondary-300">
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewComplaint(complaint)}
                            >
                              <i className="fas fa-eye mr-1"></i>
                              View
                            </Button>
                            {complaint.status !== 'Closed' && (
                              <Button
                                size="sm"
                                onClick={() => handleRespondToComplaint(complaint)}
                              >
                                <i className="fas fa-reply mr-1"></i>
                                Respond
                              </Button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredComplaints.length === 0 && (
                  <div className="text-center py-12">
                    <i className="fas fa-inbox text-secondary-400 text-4xl mb-4"></i>
                    <p className="text-secondary-600 dark:text-secondary-400">No complaints found</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Complaint Details Modal */}
        <Modal
          isOpen={selectedComplaint && !showResponseModal}
          onClose={() => setSelectedComplaint(null)}
          title="Complaint Details"
          size="lg"
        >
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Ticket Number
                  </label>
                  <p className="text-secondary-900 dark:text-secondary-100">{selectedComplaint.ticketNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Tracking Number
                  </label>
                  <p className="text-secondary-900 dark:text-secondary-100">{selectedComplaint.trackingNumber}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Nature of Complaint
                </label>
                <p className="text-secondary-900 dark:text-secondary-100">{selectedComplaint.natureOfComplaint}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Description
                </label>
                <p className="text-secondary-900 dark:text-secondary-100">{selectedComplaint.issueDescription}</p>
              </div>
              
              {selectedComplaint.remark && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Admin Response
                  </label>
                  <p className="text-secondary-900 dark:text-secondary-100 bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                    {selectedComplaint.remark}
                  </p>
                </div>
              )}
              
              <div className="flex space-x-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Change Status
                  </label>
                  <select
                    id="complaintStatus"
                    name="complaintStatus"
                    value={selectedComplaint.status}
                    onChange={(e) => handleUpdateStatus(selectedComplaint._id, e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Response Modal */}
        <Modal
          isOpen={showResponseModal}
          onClose={() => setShowResponseModal(false)}
          title="Respond to Complaint"
          size="lg"
        >
          <div className="space-y-4">
            {selectedComplaint && (
              <>
                <div className="bg-secondary-50 dark:bg-secondary-800 p-4 rounded-lg">
                  <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                    Ticket: {selectedComplaint.ticketNumber}
                  </p>
                  <p className="text-sm font-medium text-secondary-800 dark:text-secondary-200">
                    {selectedComplaint.natureOfComplaint}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Your Response
                  </label>
                  <textarea
                    id="responseText"
                    name="responseText"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Enter your response to the customer..."
                    rows="6"
                    className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                  <Button
                    variant="outline"
                    onClick={() => setShowResponseModal(false)}
                    disabled={responseLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={responseLoading}
                  >
                    {responseLoading ? <LoadingSpinner size="sm" /> : 'Send Response'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ManageComplaints; 