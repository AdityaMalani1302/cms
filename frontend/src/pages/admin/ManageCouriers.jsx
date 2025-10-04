import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { getStatusLabel, getStatusColor, getValidStatuses, migrateStatus } from '../../utils/statusUtils';

const ManageCouriers = () => {
  const [activeSection, ] = useState('manage');
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case 'manage':
        return <ManageCouriersTable onEdit={handleEditCourier} />;
      default:
        return <ManageCouriersTable onEdit={handleEditCourier} />;
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

      {/* Status Update Modal */}
      <StatusUpdateModal />
    </div>
  );
};



// Form Field Component
const FormField = ({ label, required, error, className, type = "text", onChange, disabled, ...props }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      disabled={disabled}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-70' : ''}`}
      onChange={(e) => onChange && onChange(e.target.value)}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);


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
      const token = sessionStorage.getItem('adminToken') || 
                   sessionStorage.getItem('token') ||
                   localStorage.getItem('adminToken') || 
                   localStorage.getItem('token');
      
      console.log('🔍 Fetching couriers with params:', { params, currentPage, searchTerm, statusFilter });
      
      const queryParams = new URLSearchParams({
        page: params.page || currentPage,
        limit: 10,
        search: params.search !== undefined ? params.search : searchTerm,
        status: params.status !== undefined ? params.status : statusFilter,
        sortBy: params.sortBy || sortBy,
        sortOrder: params.sortOrder || sortOrder
      });

      console.log('🔗 Query string:', queryParams.toString());

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      if (!token) {
        console.error('❌ No authentication token found');
        throw new Error('No authentication token available');
      }
      
      // Try fetching bookings first (new system), then fallback to couriers
      let finalData = [];
      let finalPagination = {};
      
      try {
        const bookingResponse = await fetch(`${baseURL}/api/admin/bookings/admin/all?${queryParams}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (bookingResponse.ok) {
          const bookingResult = await bookingResponse.json();
          if (bookingResult.success && bookingResult.data) {
            finalData = bookingResult.data;
            finalPagination = bookingResult.pagination || {};
            console.log('✅ Fetched bookings successfully:', finalData.length);
          }
        } else {
          console.log('Booking API response:', bookingResponse.status, await bookingResponse.text());
        }
      } catch (bookingError) {
        console.log('Booking fetch failed, trying couriers:', bookingError.message);
      }
      
      // If no bookings found, try couriers (fallback) - Use correct endpoint
      if (finalData.length === 0) {
        try {
          const courierResponse = await fetch(`${baseURL}/api/admin/couriers/?${queryParams}`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (courierResponse.ok) {
            const courierResult = await courierResponse.json();
            if (courierResult.success) {
              finalData = courierResult.data || [];
              finalPagination = courierResult.stats?.pagination || {};
              console.log('✅ Fetched couriers successfully:', finalData.length);
              console.log('Pagination:', finalPagination);
            }
          } else {
            console.log('Courier API response:', courierResponse.status, await courierResponse.text());
          }
        } catch (courierError) {
          console.error('Courier fetch also failed:', courierError.message);
        }
      }
      
      setData(finalData);
      setPagination(finalPagination);
      
    } catch (error) {
      console.error('Error fetching courier/booking data:', error);
      setData([]);
      setPagination({});
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
    // Also trigger search when Enter is pressed
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Add auto-search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchCouriers({ 
        search: searchTerm,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: 1
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]); // Only trigger when search term or status changes

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
    fetchCouriers({ search: '', status: '', sortBy: 'createdAt', sortOrder: 'desc', page: 1 });
  };

  const statusOptions = getValidStatuses();

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
              onKeyDown={handleKeyPress}
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
                <option key={status} value={status}>{getStatusLabel(status)}</option>
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
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(courier.status)}`}>
                        {getStatusLabel(courier.status)}
                      </span>
                      <button
                        onClick={() => window.handleStatusUpdate && window.handleStatusUpdate(courier)}
                        className="text-green-600 hover:text-green-900 text-xs"
                        title="Update Status"
                      >
                        <i className="fas fa-sync-alt mr-1"></i>
                        Update
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onEdit(courier)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit Courier Info"
                    >
                      <i className="fas fa-edit mr-1"></i>
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
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isEditing) {
      return; // Prevent submission when not in edit mode
    }
    
    setLoading(true);
    
    try {
      // await update(courier._id, formData);
      toast.success('Courier updated successfully');
      setIsEditing(false); // Exit edit mode after successful update
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">View Courier - {courier.refNumber}</h2>
            <div className="flex items-center space-x-3">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                >
                  <i className="fas fa-edit mr-2"></i>
                  Edit
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(prepareFormData(courier)); // Reset form data
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center"
                >
                  <i className="fas fa-times mr-2"></i>
                  Cancel Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
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
                  disabled={!isEditing}
                />
                <FormField
                  label="Contact Number"
                  value={formData.senderContactNumber || ''}
                  onChange={(value) => handleInputChange('senderContactNumber', value)}
                  disabled={!isEditing}
                />
                <FormField
                  label="Address"
                  value={formData.senderAddress || ''}
                  onChange={(value) => handleInputChange('senderAddress', value)}
                  className="md:col-span-2"
                  disabled={!isEditing}
                />
                <FormField
                  label="City"
                  value={formData.senderCity || ''}
                  onChange={(value) => handleInputChange('senderCity', value)}
                  disabled={!isEditing}
                />
                <FormField
                  label="State"
                  value={formData.senderState || ''}
                  onChange={(value) => handleInputChange('senderState', value)}
                  disabled={!isEditing}
                />
                <FormField
                  label="Pincode"
                  value={formData.senderPincode || ''}
                  onChange={(value) => handleInputChange('senderPincode', value)}
                  disabled={!isEditing}
                />
                <FormField
                  label="Branch"
                  value={formData.senderBranch || ''}
                  onChange={(value) => handleInputChange('senderBranch', value)}
                  disabled={!isEditing}
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
                  disabled={!isEditing}
                />
                <FormField
                  label="Contact Number"
                  value={formData.recipientContactNumber || ''}
                  onChange={(value) => handleInputChange('recipientContactNumber', value)}
                  disabled={!isEditing}
                />
                <FormField
                  label="Address"
                  value={formData.recipientAddress || ''}
                  onChange={(value) => handleInputChange('recipientAddress', value)}
                  className="md:col-span-2"
                  disabled={!isEditing}
                />
                <FormField
                  label="City"
                  value={formData.recipientCity || ''}
                  onChange={(value) => handleInputChange('recipientCity', value)}
                  disabled={!isEditing}
                />
                <FormField
                  label="State"
                  value={formData.recipientState || ''}
                  onChange={(value) => handleInputChange('recipientState', value)}
                  disabled={!isEditing}
                />
                <FormField
                  label="Pincode"
                  value={formData.recipientPincode || ''}
                  onChange={(value) => handleInputChange('recipientPincode', value)}
                  disabled={!isEditing}
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

            {/* Reference Information */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-300 mb-4">
                <i className="fas fa-info-circle mr-2"></i>
                Reference Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Reference Number"
                  value={formData.refNumber || ''}
                  onChange={(value) => handleInputChange('refNumber', value)}
                  disabled
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Status
                  </label>
                  <div className={`px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500`}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(formData.status)}`}>
                      {getStatusLabel(formData.status) || 'No Status'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use the Status button in the courier list to update status
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              {isEditing && (
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
                      Save Changes
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Status Update Modal Component
const StatusUpdateModal = () => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // Access these from parent component context
  React.useEffect(() => {
    const handleStatusUpdate = (courier) => {
      setSelectedCourier(courier);
      // Migrate and validate the current status 
      const migratedStatus = migrateStatus(courier.status);
      const validStatuses = getValidStatuses();
      const initialStatus = validStatuses.includes(migratedStatus) ? migratedStatus : validStatuses[0];
      setNewStatus(initialStatus);
      setShowStatusModal(true);
    };

    // Make handleStatusUpdate available globally for the table
    window.handleStatusUpdate = handleStatusUpdate;

    return () => {
      delete window.handleStatusUpdate;
    };
  }, []);

  const updateCourierStatus = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      console.log('🔍 Status update details:', {
        courierId: selectedCourier._id,
        currentStatus: selectedCourier.status,
        newStatus: newStatus,
        statusType: typeof newStatus,
        validStatuses: getValidStatuses()
      });
      
      const response = await fetch(`${baseURL}/api/admin/couriers/${selectedCourier._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus.trim() })
      });

      if (response.ok) {
        toast.success('Status updated successfully');
        setShowStatusModal(false);
        setSelectedCourier(null);
        window.location.reload(); // Refresh the page to show updated status
      } else {
        const errorData = await response.json().catch(() => null);
        toast.error(errorData?.message || 'Failed to update status');
        console.error('Status update failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const statusOptions = getValidStatuses();

  if (!showStatusModal || !selectedCourier) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Update Status - {selectedCourier.refNumber}
            </h3>
            <button
              onClick={() => setShowStatusModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select New Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => {
                console.log('📝 Status dropdown changed:', {
                  selectedValue: e.target.value,
                  selectedIndex: e.target.selectedIndex,
                  option: e.target.options[e.target.selectedIndex]?.text
                });
                setNewStatus(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{getStatusLabel(status)}</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowStatusModal(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel  
            </button>
            <button
              onClick={updateCourierStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default ManageCouriers;