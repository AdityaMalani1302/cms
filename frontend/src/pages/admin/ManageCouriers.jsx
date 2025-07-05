import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useApi, useCrud } from '../../hooks/useApi';

const ManageCouriers = () => {
  const [activeSection, setActiveSection] = useState('add');
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Main sections configuration
  const sections = [
    {
      id: 'add',
      title: 'Add New Courier',
      description: 'Create new courier consignment',
      icon: 'fa-plus-circle',
      color: 'green'
    },
    {
      id: 'pending',
      title: 'Pending Approvals',
      description: 'Review and approve courier applications',
      icon: 'fa-clock',
      color: 'yellow'
    },
    {
      id: 'track',
      title: 'Track Couriers',
      description: 'Real-time tracking and monitoring',
      icon: 'fa-route',
      color: 'purple'
    },
    {
      id: 'manage',
      title: 'Manage & Edit',
      description: 'Edit and manage existing couriers',
      icon: 'fa-edit',
      color: 'orange'
    },
    {
      id: 'status',
      title: 'Update Status',
      description: 'Update courier delivery status',
      icon: 'fa-sync-alt',
      color: 'indigo'
    }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'add':
        return <AddCourierForm onSuccess={() => setActiveSection('manage')} />;
      case 'pending':
        return <PendingApprovals onApprovalChange={() => setActiveSection('manage')} />;
      case 'track':
        return <TrackCouriers />;
      case 'manage':
        return <ManageCouriersTable onEdit={handleEditCourier} />;
      case 'status':
        return <UpdateStatusForm />;
      default:
        return <AddCourierForm onSuccess={() => setActiveSection('manage')} />;
    }
  };

  const handleEditCourier = (courier) => {
    setSelectedCourier(courier);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <i className="fas fa-truck text-blue-600 mr-3"></i>
                Manage Couriers
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Complete courier management system with real-time tracking and analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {sections.map((section) => (
              <motion.button
                key={section.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeSection === section.id
                    ? `border-${section.color}-500 text-${section.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`fas ${section.icon} mr-2`}></i>
                <div className="text-left">
                  <div>{section.title}</div>
                  <div className="text-xs text-gray-400">{section.description}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
      {showModal && selectedCourier && (
        <EditCourierModal
          courier={selectedCourier}
          onClose={() => {
            setShowModal(false);
            setSelectedCourier(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setSelectedCourier(null);
            toast.success('Courier updated successfully');
          }}
        />
      )}
    </div>
  );
};

// Pending Approvals Component
const PendingApprovals = ({ onApprovalChange }) => {
  const [pendingCouriers, setPendingCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { makeRequest } = useApi();

  const fetchPendingCouriers = async (page = 1) => {
    setLoading(true);
    try {
      const response = await makeRequest({
        method: 'GET',
        endpoint: `/admin/couriers/pending-approval?page=${page}&limit=10`
      });

      if (response.success) {
        setPendingCouriers(response.data);
        setPagination(response.pagination);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching pending couriers:', error);
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (courierId) => {
    try {
      const response = await makeRequest({
        method: 'PUT',
        endpoint: `/admin/couriers/${courierId}/approve`
      });

      if (response.success) {
        toast.success('Courier application approved successfully');
        fetchPendingCouriers(currentPage);
        onApprovalChange && onApprovalChange();
      }
    } catch (error) {
      console.error('Error approving courier:', error);
      toast.error('Failed to approve courier application');
    }
  };

  const handleReject = async () => {
    if (!selectedCourier || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const response = await makeRequest({
        method: 'PUT',
        endpoint: `/admin/couriers/${selectedCourier._id}/reject`,
        data: { rejectionReason: rejectionReason.trim() }
      });

      if (response.success) {
        toast.success('Courier application rejected');
        fetchPendingCouriers(currentPage);
        setShowRejectModal(false);
        setSelectedCourier(null);
        setRejectionReason('');
        onApprovalChange && onApprovalChange();
      }
    } catch (error) {
      console.error('Error rejecting courier:', error);
      toast.error('Failed to reject courier application');
    }
  };

  useEffect(() => {
    fetchPendingCouriers();
  }, []);

  const getApprovalStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pending Courier Approvals
        </h2>
        <div className="text-sm text-gray-500">
          {pagination?.totalItems || 0} pending applications
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : pendingCouriers.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-inbox text-gray-400 text-4xl mb-4"></i>
          <p className="text-gray-600 dark:text-gray-400 text-lg">No pending courier applications</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ref Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pendingCouriers.map((courier) => (
                  <tr key={courier._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {courier.refNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        <div className="font-medium">{courier.senderName}</div>
                        <div className="text-xs text-gray-500">{courier.senderContactNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        <div className="font-medium">{courier.recipientName}</div>
                        <div className="text-xs text-gray-500">{courier.recipientContactNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        <div className="text-xs">{courier.senderCity}, {courier.senderState}</div>
                        <div className="text-xs text-gray-500">↓</div>
                        <div className="text-xs">{courier.recipientCity}, {courier.recipientState}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getApprovalStatusBadge(courier.approvalStatus)}`}>
                        {courier.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(courier.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(courier._id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200"
                        >
                          <i className="fas fa-check mr-1"></i>
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCourier(courier);
                            setShowRejectModal(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200"
                        >
                          <i className="fas fa-times mr-1"></i>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination?.total > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing page {currentPage} of {pagination.total}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => fetchPendingCouriers(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchPendingCouriers(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <i className="fas fa-exclamation-triangle text-red-600"></i>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Reject Courier Application
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Are you sure you want to reject the courier application for {selectedCourier?.refNumber}?
                      </p>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a reason for rejection..."
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                        rows="4"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleReject}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Reject Application
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedCourier(null);
                    setRejectionReason('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add Courier Form Component
const AddCourierForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    // Sender Information
    senderName: '',
    senderContactNumber: '',
    senderAddress: '',
    senderCity: '',
    senderState: '',
    senderPincode: '',
    senderCountry: 'India',
    senderBranch: '',

    // Recipient Information
    recipientName: '',
    recipientContactNumber: '',
    recipientAddress: '',
    recipientCity: '',
    recipientState: '',
    recipientPincode: '',
    recipientCountry: 'India',

    // Package Information
    courierDescription: '',
    parcelWeight: '',
    parcelDimensionLength: '',
    parcelDimensionWidth: '',
    parcelDimensionHeight: '',
    parcelPrice: '',

    // Service Options
    serviceType: 'standard',
    isInsured: false,
    isCOD: false,
    codAmount: '',
    specialInstructions: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { create } = useCrud('couriers');

  const validateForm = () => {
    const newErrors = {};

    // Sender validation
    if (!formData.senderName.trim()) newErrors.senderName = 'Sender name is required';
    if (!formData.senderContactNumber.trim()) newErrors.senderContactNumber = 'Sender contact is required';
    if (!/^\d{10}$/.test(formData.senderContactNumber)) newErrors.senderContactNumber = 'Contact must be 10 digits';
    if (!formData.senderAddress.trim()) newErrors.senderAddress = 'Sender address is required';
    if (!formData.senderCity.trim()) newErrors.senderCity = 'Sender city is required';
    if (!formData.senderState.trim()) newErrors.senderState = 'Sender state is required';
    if (!formData.senderPincode.trim()) newErrors.senderPincode = 'Sender pincode is required';
    if (!/^\d{6}$/.test(formData.senderPincode)) newErrors.senderPincode = 'Pincode must be 6 digits';

    // Recipient validation
    if (!formData.recipientName.trim()) newErrors.recipientName = 'Recipient name is required';
    if (!formData.recipientContactNumber.trim()) newErrors.recipientContactNumber = 'Recipient contact is required';
    if (!/^\d{10}$/.test(formData.recipientContactNumber)) newErrors.recipientContactNumber = 'Contact must be 10 digits';
    if (!formData.recipientAddress.trim()) newErrors.recipientAddress = 'Recipient address is required';
    if (!formData.recipientCity.trim()) newErrors.recipientCity = 'Recipient city is required';
    if (!formData.recipientState.trim()) newErrors.recipientState = 'Recipient state is required';
    if (!formData.recipientPincode.trim()) newErrors.recipientPincode = 'Recipient pincode is required';
    if (!/^\d{6}$/.test(formData.recipientPincode)) newErrors.recipientPincode = 'Pincode must be 6 digits';

    // Package validation
    if (!formData.parcelWeight.trim()) newErrors.parcelWeight = 'Package weight is required';
    if (isNaN(formData.parcelWeight) || parseFloat(formData.parcelWeight) <= 0) {
      newErrors.parcelWeight = 'Weight must be a positive number';
    }
    if (!formData.parcelDimensionLength.trim()) newErrors.parcelDimensionLength = 'Length is required';
    if (!formData.parcelDimensionWidth.trim()) newErrors.parcelDimensionWidth = 'Width is required';
    if (!formData.parcelDimensionHeight.trim()) newErrors.parcelDimensionHeight = 'Height is required';
    if (!formData.parcelPrice.trim()) newErrors.parcelPrice = 'Price is required';
    if (isNaN(formData.parcelPrice) || parseFloat(formData.parcelPrice) <= 0) {
      newErrors.parcelPrice = 'Price must be a positive number';
    }

    // COD validation
    if (formData.isCOD && (!formData.codAmount.trim() || parseFloat(formData.codAmount) <= 0)) {
      newErrors.codAmount = 'COD amount is required and must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      setLoading(true);
      await create(formData);
      toast.success('Courier created successfully');
      onSuccess && onSuccess();
    } catch (error) {
      toast.error('Failed to create courier');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create New Courier Consignment
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Fill in all the required information to create a new courier shipment
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sender Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4 flex items-center">
            <i className="fas fa-user mr-2"></i>
            Sender Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              label="Sender Name"
              required
              value={formData.senderName}
              onChange={(value) => handleInputChange('senderName', value)}
              error={errors.senderName}
            />
            <FormField
              label="Contact Number"
              required
              value={formData.senderContactNumber}
              onChange={(value) => handleInputChange('senderContactNumber', value)}
              error={errors.senderContactNumber}
              placeholder="10-digit mobile number"
            />
            <FormField
              label="Branch"
              value={formData.senderBranch}
              onChange={(value) => handleInputChange('senderBranch', value)}
              error={errors.senderBranch}
            />
            <FormField
              label="Address"
              required
              value={formData.senderAddress}
              onChange={(value) => handleInputChange('senderAddress', value)}
              error={errors.senderAddress}
              className="md:col-span-2"
            />
            <FormField
              label="City"
              required
              value={formData.senderCity}
              onChange={(value) => handleInputChange('senderCity', value)}
              error={errors.senderCity}
            />
            <FormField
              label="State"
              required
              value={formData.senderState}
              onChange={(value) => handleInputChange('senderState', value)}
              error={errors.senderState}
            />
            <FormField
              label="Pincode"
              required
              value={formData.senderPincode}
              onChange={(value) => handleInputChange('senderPincode', value)}
              error={errors.senderPincode}
              placeholder="6-digit pincode"
            />
          </div>
        </div>

        {/* Recipient Information */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-4 flex items-center">
            <i className="fas fa-map-marker-alt mr-2"></i>
            Recipient Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              label="Recipient Name"
              required
              value={formData.recipientName}
              onChange={(value) => handleInputChange('recipientName', value)}
              error={errors.recipientName}
            />
            <FormField
              label="Contact Number"
              required
              value={formData.recipientContactNumber}
              onChange={(value) => handleInputChange('recipientContactNumber', value)}
              error={errors.recipientContactNumber}
              placeholder="10-digit mobile number"
            />
            <div></div>
            <FormField
              label="Address"
              required
              value={formData.recipientAddress}
              onChange={(value) => handleInputChange('recipientAddress', value)}
              error={errors.recipientAddress}
              className="md:col-span-2"
            />
            <FormField
              label="City"
              required
              value={formData.recipientCity}
              onChange={(value) => handleInputChange('recipientCity', value)}
              error={errors.recipientCity}
            />
            <FormField
              label="State"
              required
              value={formData.recipientState}
              onChange={(value) => handleInputChange('recipientState', value)}
              error={errors.recipientState}
            />
            <FormField
              label="Pincode"
              required
              value={formData.recipientPincode}
              onChange={(value) => handleInputChange('recipientPincode', value)}
              error={errors.recipientPincode}
              placeholder="6-digit pincode"
            />
          </div>
        </div>

        {/* Package Information */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-4 flex items-center">
            <i className="fas fa-box mr-2"></i>
            Package Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FormField
              label="Description"
              value={formData.courierDescription}
              onChange={(value) => handleInputChange('courierDescription', value)}
              error={errors.courierDescription}
              className="md:col-span-2"
              placeholder="Brief description of package contents"
            />
            <FormField
              label="Weight (kg)"
              required
              type="number"
              step="0.1"
              value={formData.parcelWeight}
              onChange={(value) => handleInputChange('parcelWeight', value)}
              error={errors.parcelWeight}
            />
            <FormField
              label="Price (₹)"
              required
              type="number"
              step="0.01"
              value={formData.parcelPrice}
              onChange={(value) => handleInputChange('parcelPrice', value)}
              error={errors.parcelPrice}
            />
            <FormField
              label="Length (cm)"
              required
              type="number"
              step="0.1"
              value={formData.parcelDimensionLength}
              onChange={(value) => handleInputChange('parcelDimensionLength', value)}
              error={errors.parcelDimensionLength}
            />
            <FormField
              label="Width (cm)"
              required
              type="number"
              step="0.1"
              value={formData.parcelDimensionWidth}
              onChange={(value) => handleInputChange('parcelDimensionWidth', value)}
              error={errors.parcelDimensionWidth}
            />
            <FormField
              label="Height (cm)"
              required
              type="number"
              step="0.1"
              value={formData.parcelDimensionHeight}
              onChange={(value) => handleInputChange('parcelDimensionHeight', value)}
              error={errors.parcelDimensionHeight}
            />
          </div>
        </div>

        {/* Service Options */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-300 mb-4 flex items-center">
            <i className="fas fa-cogs mr-2"></i>
            Service Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Type
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => handleInputChange('serviceType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="standard">Standard Delivery</option>
                <option value="express">Express Delivery</option>
                <option value="overnight">Overnight Delivery</option>
              </select>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isInsured}
                  onChange={(e) => handleInputChange('isInsured', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Insurance</span>
              </label>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isCOD}
                  onChange={(e) => handleInputChange('isCOD', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Cash on Delivery</span>
              </label>
            </div>

            {formData.isCOD && (
              <FormField
                label="COD Amount (₹)"
                required
                type="number"
                step="0.01"
                value={formData.codAmount}
                onChange={(value) => handleInputChange('codAmount', value)}
                error={errors.codAmount}
              />
            )}

            <FormField
              label="Special Instructions"
              value={formData.specialInstructions}
              onChange={(value) => handleInputChange('specialInstructions', value)}
              className="md:col-span-2"
              placeholder="Any special handling or delivery instructions"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => setFormData({})}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Reset Form
          </button>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Creating...
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2"></i>
                Create Courier
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

// Form Field Component
const FormField = ({ label, required, error, className, type = "text", ...props }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

// Track Couriers Component
const TrackCouriers = () => {
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bulkTrackingIds, setBulkTrackingIds] = useState('');
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast.error('Please enter a tracking ID');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/tracking/${trackingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setTrackingResult(data.data);
        toast.success('Courier found successfully');
      } else {
        toast.error('Courier not found');
        setTrackingResult(null);
      }
    } catch (error) {
      toast.error('Failed to track courier');
      setTrackingResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTrack = async () => {
    const ids = bulkTrackingIds.split('\n').map(id => id.trim()).filter(id => id);
    
    if (ids.length === 0) {
      toast.error('Please enter at least one tracking ID');
      return;
    }

    setBulkLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/couriers/bulk-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ trackingIds: ids })
      });
      const data = await response.json();
      
      if (data.success) {
        setBulkResults(data.data);
        toast.success(`Tracked ${data.data.length} couriers`);
      } else {
        toast.error('Failed to track couriers');
      }
    } catch (error) {
      toast.error('Failed to bulk track couriers');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Single Tracking */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Track Single Courier
        </h2>
        
        <div className="flex space-x-4 mb-6">
          <input
            type="text"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Enter tracking ID or reference number"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <motion.button
            onClick={handleTrack}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            {loading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <>
                <i className="fas fa-search mr-2"></i>
                Track
              </>
            )}
          </motion.button>
        </div>

        {trackingResult && (
          <TrackingResult courier={trackingResult} />
        )}
      </div>

      {/* Bulk Tracking */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Bulk Track Multiple Couriers
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter tracking IDs (one per line)
            </label>
            <textarea
              value={bulkTrackingIds}
              onChange={(e) => setBulkTrackingIds(e.target.value)}
              placeholder="Enter tracking IDs separated by new lines..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <motion.button
            onClick={handleBulkTrack}
            disabled={bulkLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            {bulkLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Tracking...
              </>
            ) : (
              <>
                <i className="fas fa-layer-group mr-2"></i>
                Bulk Track
              </>
            )}
          </motion.button>
        </div>

        {bulkResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Bulk Tracking Results</h3>
            <div className="space-y-4">
              {bulkResults.map((courier, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{courier.refNumber}</p>
                      <p className="text-sm text-gray-500">{courier.senderName} → {courier.recipientName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(courier.status)}`}>
                      {courier.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <RecentCouriers />
    </div>
  );
};

// Tracking Result Component
const TrackingResult = ({ courier }) => {
  const statusSteps = [
    'Courier Pickup',
    'Shipped',
    'Intransit',
    'Arrived at Destination',
    'Out for Delivery',
    'Delivered'
  ];

  const currentStepIndex = statusSteps.indexOf(courier.status);

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Courier Details</h3>
          <div className="space-y-2">
            <p><strong>Reference:</strong> {courier.refNumber}</p>
            <p><strong>From:</strong> {courier.senderName}, {courier.senderCity}</p>
            <p><strong>To:</strong> {courier.recipientName}, {courier.recipientCity}</p>
            <p><strong>Status:</strong> 
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(courier.status)}`}>
                {courier.status}
              </span>
            </p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">Delivery Progress</h3>
          <div className="space-y-3">
            {statusSteps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-4 h-4 rounded-full ${
                  index <= currentStepIndex ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className={`ml-3 ${
                  index <= currentStepIndex ? 'text-green-600 font-medium' : 'text-gray-500'
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Manage Couriers Table Component
const ManageCouriersTable = ({ onEdit }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCouriers = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams({
        page: params.page || currentPage,
        limit: 10,
        search: params.search !== undefined ? params.search : searchTerm,
        status: params.status !== undefined ? params.status : statusFilter,
        sortBy: params.sortBy || sortBy,
        sortOrder: params.sortOrder || sortOrder
      });

      const response = await fetch(`/api/admin/couriers?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setData(result.data || []);
          setPagination(result.pagination || {});
        }
      }
    } catch (error) {
      console.error('Error fetching couriers:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

  // Only fetch on component mount
  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCouriers({ 
      search: searchTerm,
      status: statusFilter,
      sortBy,
      sortOrder,
      page: 1
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
    fetchCouriers({ search: '', status: '', sortBy: 'createdAt', sortOrder: 'desc', page: 1 });
  };

  const statusOptions = [
    'Courier Pickup',
    'Shipped', 
    'Intransit',
    'Arrived at Destination',
    'Out for Delivery',
    'Delivered',
    'Pickup Failed',
    'Delivery Failed'
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Manage Existing Couriers
        </h2>
        <div className="text-sm text-gray-500">
          Total: {pagination?.total || 0} couriers
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ref number, sender, recipient..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              <option value="createdAt">Created Date</option>
              <option value="refNumber">Reference Number</option>
              <option value="senderName">Sender Name</option>
              <option value="recipientName">Recipient Name</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <motion.button
              onClick={handleSearch}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <i className="fas fa-search mr-2"></i>
              Search
            </motion.button>
            <motion.button
              onClick={handleClearFilters}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <i className="fas fa-times mr-2"></i>
              Clear
            </motion.button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data?.map((courier) => (
                <tr key={courier._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {courier.refNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {courier.senderName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {courier.recipientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(courier.status)}`}>
                      {courier.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onEdit(courier)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((pagination.current - 1) * pagination.limit) + 1} to {Math.min(pagination.current * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const newPage = pagination.current - 1;
                    setCurrentPage(newPage);
                    fetchCouriers({ page: newPage });
                  }}
                  disabled={pagination.current === 1}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <i className="fas fa-chevron-left"></i>
                </motion.button>
                
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.current <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.current >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.current - 2 + i;
                  }
                  
                  return (
                    <motion.button
                      key={pageNum}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        fetchCouriers({ page: pageNum });
                      }}
                      className={`px-3 py-2 border rounded-lg ${
                        pagination.current === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </motion.button>
                  );
                })}
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const newPage = pagination.current + 1;
                    setCurrentPage(newPage);
                    fetchCouriers({ page: newPage });
                  }}
                  disabled={pagination.current === pagination.pages}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <i className="fas fa-chevron-right"></i>
                </motion.button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Update Status Form Component
const UpdateStatusForm = () => {
  const [refNumber, setRefNumber] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkRefNumbers, setBulkRefNumbers] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const statusOptions = [
    'Courier Pickup',
    'Shipped',
    'Intransit',
    'Arrived at Destination',
    'Out for Delivery',
    'Delivered',
    'Pickup Failed',
    'Delivery Failed'
  ];

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    
    if (!refNumber.trim() || !newStatus) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/couriers/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ refNumber, status: newStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Status updated successfully');
        setRefNumber('');
        setNewStatus('');
      } else {
        toast.error(data.message || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdateStatus = async (e) => {
    e.preventDefault();
    
    const refNumbers = bulkRefNumbers.split('\n').map(ref => ref.trim()).filter(ref => ref);
    
    if (refNumbers.length === 0 || !bulkStatus) {
      toast.error('Please fill all fields');
      return;
    }

    setBulkLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/couriers/bulk-update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ refNumbers, status: bulkStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${data.updated || refNumbers.length} couriers updated successfully`);
        setBulkRefNumbers('');
        setBulkStatus('');
      } else {
        toast.error(data.message || 'Failed to update statuses');
      }
    } catch (error) {
      toast.error('Failed to update statuses');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Single Status Update */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Update Single Courier Status
        </h2>
        
        <form onSubmit={handleUpdateStatus} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Reference Number"
              required
              value={refNumber}
              onChange={(value) => setRefNumber(value)}
              placeholder="Enter courier reference number"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Status <span className="text-red-500">*</span>
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Updating...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt mr-2"></i>
                Update Status
              </>
            )}
          </motion.button>
        </form>
      </div>

      {/* Bulk Status Update */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Bulk Update Courier Status
        </h2>
        
        <form onSubmit={handleBulkUpdateStatus} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reference Numbers <span className="text-red-500">*</span>
              </label>
              <textarea
                value={bulkRefNumbers}
                onChange={(e) => setBulkRefNumbers(e.target.value)}
                placeholder="Enter reference numbers separated by new lines..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <p className="text-sm text-gray-500 mt-1">Enter one reference number per line</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Status <span className="text-red-500">*</span>
              </label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start">
                  <i className="fas fa-exclamation-triangle text-yellow-600 mt-1 mr-2"></i>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Bulk Update Warning
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      This will update the status for all entered reference numbers. Please verify the references before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={bulkLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            {bulkLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Updating...
              </>
            ) : (
              <>
                <i className="fas fa-layer-group mr-2"></i>
                Bulk Update Status
              </>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  );
};

// Recent Couriers Component
const RecentCouriers = ({ limit = 5 }) => {
  const { data, loading } = useApi(`/api/admin/couriers?limit=${limit}`, {
    immediate: true,
    onError: (error) => {
      console.error('Recent couriers error:', error);
    }
  });

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {(data?.data || data)?.map((courier) => (
        <div key={courier._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <p className="font-medium">{courier.refNumber}</p>
            <p className="text-sm text-gray-500">{courier.senderName} → {courier.recipientName}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(courier.status)}`}>
            {courier.status}
          </span>
        </div>
      ))}
    </div>
  );
};

// Edit Courier Modal Component
const EditCourierModal = ({ courier, onClose, onSuccess }) => {
  // Helper function to safely convert values to strings for form inputs
  const prepareFormData = (courierData) => {
    const prepared = {};
    Object.keys(courierData).forEach(key => {
      const value = courierData[key];
      if (value === null || value === undefined) {
        prepared[key] = '';
      } else if (typeof value === 'object') {
        // Convert object to empty string to avoid [object Object]
        prepared[key] = '';
      } else {
        prepared[key] = String(value);
      }
    });
    return prepared;
  };

  const [formData, setFormData] = useState(prepareFormData(courier));
  const [loading, setLoading] = useState(false);
  const { update } = useCrud('couriers');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await update(courier._id, formData);
      onSuccess();
    } catch (error) {
      toast.error('Failed to update courier');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: value || '' 
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Courier - {courier.refNumber}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sender Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">
                <i className="fas fa-user mr-2"></i>
                Sender Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Sender Name"
                  value={formData.senderName || ''}
                  onChange={(value) => handleInputChange('senderName', value)}
                />
                <FormField
                  label="Contact Number"
                  value={formData.senderContactNumber || ''}
                  onChange={(value) => handleInputChange('senderContactNumber', value)}
                />
                <FormField
                  label="Address"
                  value={formData.senderAddress || ''}
                  onChange={(value) => handleInputChange('senderAddress', value)}
                  className="md:col-span-2"
                />
                <FormField
                  label="City"
                  value={formData.senderCity || ''}
                  onChange={(value) => handleInputChange('senderCity', value)}
                />
                <FormField
                  label="State"
                  value={formData.senderState || ''}
                  onChange={(value) => handleInputChange('senderState', value)}
                />
                <FormField
                  label="Pincode"
                  value={formData.senderPincode || ''}
                  onChange={(value) => handleInputChange('senderPincode', value)}
                />
                <FormField
                  label="Branch"
                  value={formData.senderBranch || ''}
                  onChange={(value) => handleInputChange('senderBranch', value)}
                />
              </div>
            </div>

            {/* Recipient Information */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-4">
                <i className="fas fa-map-marker-alt mr-2"></i>
                Recipient Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Recipient Name"
                  value={formData.recipientName || ''}
                  onChange={(value) => handleInputChange('recipientName', value)}
                />
                <FormField
                  label="Contact Number"
                  value={formData.recipientContactNumber || ''}
                  onChange={(value) => handleInputChange('recipientContactNumber', value)}
                />
                <FormField
                  label="Address"
                  value={formData.recipientAddress || ''}
                  onChange={(value) => handleInputChange('recipientAddress', value)}
                  className="md:col-span-2"
                />
                <FormField
                  label="City"
                  value={formData.recipientCity || ''}
                  onChange={(value) => handleInputChange('recipientCity', value)}
                />
                <FormField
                  label="State"
                  value={formData.recipientState || ''}
                  onChange={(value) => handleInputChange('recipientState', value)}
                />
                <FormField
                  label="Pincode"
                  value={formData.recipientPincode || ''}
                  onChange={(value) => handleInputChange('recipientPincode', value)}
                />
              </div>
            </div>

            {/* Package Information */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-4">
                <i className="fas fa-box mr-2"></i>
                Package Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Description"
                  value={formData.courierDescription || ''}
                  onChange={(value) => handleInputChange('courierDescription', value)}
                  className="md:col-span-2"
                />
                <FormField
                  label="Weight (kg)"
                  type="text"
                  value={formData.parcelWeight || ''}
                  onChange={(value) => handleInputChange('parcelWeight', value)}
                />
                <FormField
                  label="Price (₹)"
                  type="text"
                  value={formData.parcelPrice || ''}
                  onChange={(value) => handleInputChange('parcelPrice', value)}
                />
                <FormField
                  label="Length (cm)"
                  type="text"
                  value={formData.parcelDimensionLength || ''}
                  onChange={(value) => handleInputChange('parcelDimensionLength', value)}
                />
                <FormField
                  label="Width (cm)"
                  type="text"
                  value={formData.parcelDimensionWidth || ''}
                  onChange={(value) => handleInputChange('parcelDimensionWidth', value)}
                />
                <FormField
                  label="Height (cm)"
                  type="text"
                  value={formData.parcelDimensionHeight || ''}
                  onChange={(value) => handleInputChange('parcelDimensionHeight', value)}
                />
              </div>
            </div>

            {/* Status */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-300 mb-4">
                <i className="fas fa-info-circle mr-2"></i>
                Status Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Status
                  </label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Status</option>
                    <option value="Courier Pickup">Courier Pickup</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Intransit">In Transit</option>
                    <option value="Arrived at Destination">Arrived at Destination</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Pickup Failed">Pickup Failed</option>
                    <option value="Delivery Failed">Delivery Failed</option>
                  </select>
                </div>
                <FormField
                  label="Reference Number"
                  value={formData.refNumber || ''}
                  onChange={(value) => handleInputChange('refNumber', value)}
                  disabled
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Update Courier
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Utility function for status colors
const getStatusColor = (status) => {
  const colors = {
    'Courier Pickup': 'bg-yellow-100 text-yellow-800',
    'Shipped': 'bg-blue-100 text-blue-800',
    'Intransit': 'bg-purple-100 text-purple-800',
    'Arrived at Destination': 'bg-indigo-100 text-indigo-800',
    'Out for Delivery': 'bg-orange-100 text-orange-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Pickup Failed': 'bg-red-100 text-red-800',
    'Delivery Failed': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export default ManageCouriers; 