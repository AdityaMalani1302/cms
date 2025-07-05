import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge, Button, LoadingSpinner, PasswordInput } from '../../components/ui';
import { toast } from 'react-toastify';
import axios from 'axios';
import { safeStringValue, prepareFormData } from '../../utils/formHelpers';

const DeliveryAgentManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    totalDeliveries: 0,
    avgRating: 0
  });

  // Performance tab states
  const [performanceData, setPerformanceData] = useState([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // Consignments tab states
  const [consignmentData, setConsignmentData] = useState({
    consignments: [],
    agent: null,
    pagination: {}
  });
  const [loadingConsignments, setLoadingConsignments] = useState(false);
  const [consignmentStatus, setConsignmentStatus] = useState('all');
  const [consignmentPage, setConsignmentPage] = useState(1);

  // Form states
  const [newAgentForm, setNewAgentForm] = useState({
    agentName: '',
    agentEmail: '',
    agentPassword: '',
    agentMobileNumber: '',
    assignedBranch: '',
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    workingHours: {
      startTime: '',
      endTime: ''
    },
    workingDays: [],
    emergencyContact: {
      name: '',
      phoneNumber: '',
      relationship: ''
    }
  });

  const [formErrors, setFormErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // API utility function
  const makeRequest = useCallback(async (url, method = 'GET', data = null) => {
    try {
      const token = localStorage.getItem('adminToken');
      const config = {
        method,
        url: `http://localhost:5000${url}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await makeRequest('/api/admin/delivery-agents', 'GET');
      if (response.success) {
        setAgents(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to fetch delivery agents');
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await makeRequest('/api/admin/delivery-agents/stats', 'GET');
      if (response.success) {
        setStats(response.data || {
          totalAgents: 0,
          activeAgents: 0,
          totalDeliveries: 0,
          avgRating: 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [makeRequest]);

  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoadingPerformance(true);
      const response = await makeRequest('/api/admin/delivery-agents/performance-overview', 'GET');
      if (response.success) {
        setPerformanceData(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast.error('Failed to fetch performance data');
    } finally {
      setLoadingPerformance(false);
    }
  }, [makeRequest]);

  const fetchConsignments = useCallback(async (agentId, status = 'all', page = 1) => {
    try {
      setLoadingConsignments(true);
      const response = await makeRequest(
        `/api/admin/delivery-agents/${agentId}/consignments?status=${status}&page=${page}&limit=10`, 
        'GET'
      );
      if (response.success) {
        setConsignmentData(response.data);
      }
    } catch (error) {
      console.error('Error fetching consignments:', error);
      toast.error('Failed to fetch consignments');
    } finally {
      setLoadingConsignments(false);
    }
  }, [makeRequest]);

  useEffect(() => {
    fetchAgents();
    fetchStats();
  }, [fetchAgents, fetchStats]);

  const validateForm = () => {
    const errors = {};

    // Required field validation
    if (!newAgentForm.agentName.trim()) errors.agentName = 'Agent name is required';
    if (!newAgentForm.agentEmail.trim()) errors.agentEmail = 'Email is required';
    if (!newAgentForm.agentPassword.trim()) errors.agentPassword = 'Password is required';
    if (!newAgentForm.agentMobileNumber.trim()) errors.agentMobileNumber = 'Mobile number is required';
    if (!newAgentForm.assignedBranch.trim()) errors.assignedBranch = 'Assigned branch is required';
    if (!newAgentForm.vehicleType) errors.vehicleType = 'Vehicle type is required';
    if (!newAgentForm.address.trim()) errors.address = 'Address is required';
    if (!newAgentForm.city.trim()) errors.city = 'City is required';
    if (!newAgentForm.state.trim()) errors.state = 'State is required';
    if (!newAgentForm.pincode.trim()) errors.pincode = 'Pincode is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newAgentForm.agentEmail && !emailRegex.test(newAgentForm.agentEmail)) {
      errors.agentEmail = 'Please enter a valid email address';
    }

    // Mobile number validation (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (newAgentForm.agentMobileNumber && !mobileRegex.test(newAgentForm.agentMobileNumber)) {
      errors.agentMobileNumber = 'Mobile number must be 10 digits';
    }

    // Pincode validation (6 digits)
    const pincodeRegex = /^[0-9]{6}$/;
    if (newAgentForm.pincode && !pincodeRegex.test(newAgentForm.pincode)) {
      errors.pincode = 'Pincode must be 6 digits';
    }

    // Password validation (minimum 6 characters)
    if (newAgentForm.agentPassword && newAgentForm.agentPassword.length < 6) {
      errors.agentPassword = 'Password must be at least 6 characters';
    }

    // Emergency contact validation if provided
    if (newAgentForm.emergencyContact.phoneNumber) {
      if (!mobileRegex.test(newAgentForm.emergencyContact.phoneNumber)) {
        errors['emergencyContact.phoneNumber'] = 'Emergency contact must be 10 digits';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateAgentId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `AGT${timestamp}${random}`;
  };

  const handleAddAgent = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      setLoading(true);
      
      const agentData = {
        ...newAgentForm,
        agentId: generateAgentId()
      };

      const response = await makeRequest('/api/admin/delivery-agents', 'POST', agentData);
      
      if (response.success) {
        toast.success('Delivery agent added successfully!');
        setNewAgentForm({
          agentName: '',
          agentEmail: '',
          agentPassword: '',
          agentMobileNumber: '',
          assignedBranch: '',
          vehicleType: '',
          vehicleNumber: '',
          licenseNumber: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          workingHours: {
            startTime: '',
            endTime: ''
          },
          workingDays: [],
          emergencyContact: {
            name: '',
            phoneNumber: '',
            relationship: ''
          }
        });
        setFormErrors({});
        setActiveTab('manage');
        fetchAgents();
        fetchStats();
      }
    } catch (error) {
      console.error('Error adding agent:', error);
      toast.error(error.response?.data?.message || 'Failed to add delivery agent');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setNewAgentForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: safeStringValue(value)
        }
      }));
    } else {
      setNewAgentForm(prev => ({
        ...prev,
        [name]: safeStringValue(value)
      }));
    }

    // Clear specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleWorkingDaysChange = (day) => {
    setNewAgentForm(prev => {
      const workingDays = prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day];
      
      return { ...prev, workingDays };
    });
  };

  const getFieldValue = (fieldPath) => {
    if (fieldPath.includes('.')) {
      const [parent, child] = fieldPath.split('.');
      return safeStringValue(newAgentForm[parent]?.[child] || '');
    }
    return safeStringValue(newAgentForm[fieldPath] || '');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { id: 'add', label: 'Add New Agent', icon: 'fas fa-user-plus' },
    { id: 'performance', label: 'Agent Performance', icon: 'fas fa-chart-bar' },
    { id: 'manage', label: 'Manage Agents', icon: 'fas fa-users-cog' },
    { id: 'consignments', label: 'Track Consignments', icon: 'fas fa-shipping-fast' }
  ];

  const vehicleTypes = [
    { value: 'bike', label: 'Bike' },
    { value: 'car', label: 'Car' },
    { value: 'van', label: 'Van' },
    { value: 'truck', label: 'Truck' },
    { value: 'bicycle', label: 'Bicycle' }
  ];

  const weekdays = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.agentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.agentEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.agentId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const paginatedAgents = filteredAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);

  const renderDashboard = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Agents</p>
              <p className="text-3xl font-bold">{stats.totalAgents}</p>
            </div>
            <i className="fas fa-users text-4xl text-blue-200"></i>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Active Agents</p>
              <p className="text-3xl font-bold">{stats.activeAgents}</p>
            </div>
            <i className="fas fa-user-check text-4xl text-green-200"></i>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Total Deliveries</p>
              <p className="text-3xl font-bold">{stats.totalDeliveries}</p>
            </div>
            <i className="fas fa-shipping-fast text-4xl text-purple-200"></i>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Avg Rating</p>
              <p className="text-3xl font-bold">{stats.avgRating}</p>
            </div>
            <i className="fas fa-star text-4xl text-orange-200"></i>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {paginatedAgents.slice(0, 5).map((agent, index) => (
            <div key={agent._id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {agent.agentName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{agent.agentName}</p>
                  <p className="text-sm text-secondary-600">{agent.agentId}</p>
                </div>
              </div>
              <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>
                {agent.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );

  const renderAddAgent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-6">Add New Delivery Agent</h3>
        
        <form onSubmit={handleAddAgent} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <h4 className="text-lg font-semibold text-blue-800 mb-4">
              <i className="fas fa-user-circle mr-2"></i>
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  name="agentName"
                  value={getFieldValue('agentName')}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.agentName ? 'border-red-500' : 'border-secondary-300'
                  }`}
                  placeholder="Enter agent full name"
                />
                {formErrors.agentName && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.agentName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="agentEmail"
                  value={getFieldValue('agentEmail')}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.agentEmail ? 'border-red-500' : 'border-secondary-300'
                  }`}
                  placeholder="agent@example.com"
                />
                {formErrors.agentEmail && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.agentEmail}</p>
                )}
              </div>

              <div>
                <PasswordInput
                  label="Password"
                  name="agentPassword"
                  id="agentPassword"
                  value={getFieldValue('agentPassword')}
                  onChange={handleInputChange}
                  error={formErrors.agentPassword ? formErrors.agentPassword : null}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  helpText="Password must be at least 6 characters"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.agentPassword ? 'border-red-500' : 'border-secondary-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  name="agentMobileNumber"
                  value={getFieldValue('agentMobileNumber')}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.agentMobileNumber ? 'border-red-500' : 'border-secondary-300'
                  }`}
                  placeholder="10-digit mobile number"
                  maxLength="10"
                />
                {formErrors.agentMobileNumber && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.agentMobileNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Work Details */}
          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
            <h4 className="text-lg font-semibold text-green-800 mb-4">
              <i className="fas fa-briefcase mr-2"></i>
              Work Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Assigned Branch *
                </label>
                <input
                  type="text"
                  name="assignedBranch"
                  value={getFieldValue('assignedBranch')}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    formErrors.assignedBranch ? 'border-red-500' : 'border-secondary-300'
                  }`}
                  placeholder="Branch name"
                />
                {formErrors.assignedBranch && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.assignedBranch}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Vehicle Type *
                </label>
                <select
                  name="vehicleType"
                  value={getFieldValue('vehicleType')}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    formErrors.vehicleType ? 'border-red-500' : 'border-secondary-300'
                  }`}
                >
                  <option value="">Select vehicle type</option>
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {formErrors.vehicleType && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.vehicleType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={getFieldValue('vehicleNumber')}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Vehicle registration number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={getFieldValue('licenseNumber')}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Driving license number"
                />
              </div>
            </div>

            {/* Working Hours */}
            <div className="mt-4">
              <h5 className="font-medium text-secondary-700 mb-2">Working Hours</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-secondary-600 mb-1">Start Time</label>
                  <input
                    type="time"
                    name="workingHours.startTime"
                    value={getFieldValue('workingHours.startTime')}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-secondary-600 mb-1">End Time</label>
                  <input
                    type="time"
                    name="workingHours.endTime"
                    value={getFieldValue('workingHours.endTime')}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Working Days */}
            <div className="mt-4">
              <h5 className="font-medium text-secondary-700 mb-2">Working Days</h5>
              <div className="flex flex-wrap gap-2">
                {weekdays.map(day => (
                  <label key={day} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Array.isArray(newAgentForm.workingDays) && newAgentForm.workingDays.includes(day)}
                      onChange={() => handleWorkingDaysChange(day)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm capitalize">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
            <h4 className="text-lg font-semibold text-purple-800 mb-4">
              <i className="fas fa-map-marker-alt mr-2"></i>
              Address Information
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Address *
                </label>
                <textarea
                  name="address"
                  value={getFieldValue('address')}
                  onChange={handleInputChange}
                  rows="3"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    formErrors.address ? 'border-red-500' : 'border-secondary-300'
                  }`}
                  placeholder="Complete address"
                />
                {formErrors.address && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={getFieldValue('city')}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      formErrors.city ? 'border-red-500' : 'border-secondary-300'
                    }`}
                    placeholder="City"
                  />
                  {formErrors.city && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={getFieldValue('state')}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      formErrors.state ? 'border-red-500' : 'border-secondary-300'
                    }`}
                    placeholder="State"
                  />
                  {formErrors.state && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.state}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={getFieldValue('pincode')}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      formErrors.pincode ? 'border-red-500' : 'border-secondary-300'
                    }`}
                    placeholder="6-digit pincode"
                    maxLength="6"
                  />
                  {formErrors.pincode && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.pincode}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500">
            <h4 className="text-lg font-semibold text-orange-800 mb-4">
              <i className="fas fa-phone-alt mr-2"></i>
              Emergency Contact (Optional)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="emergencyContact.name"
                  value={getFieldValue('emergencyContact.name')}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Emergency contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="emergencyContact.phoneNumber"
                  value={getFieldValue('emergencyContact.phoneNumber')}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    formErrors['emergencyContact.phoneNumber'] ? 'border-red-500' : 'border-secondary-300'
                  }`}
                  placeholder="10-digit phone number"
                  maxLength="10"
                />
                {formErrors['emergencyContact.phoneNumber'] && (
                  <p className="text-red-500 text-sm mt-1">{formErrors['emergencyContact.phoneNumber']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Relationship
                </label>
                <input
                  type="text"
                  name="emergencyContact.relationship"
                  value={getFieldValue('emergencyContact.relationship')}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., Spouse, Parent"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewAgentForm({
                  agentName: '',
                  agentEmail: '',
                  agentPassword: '',
                  agentMobileNumber: '',
                  assignedBranch: '',
                  vehicleType: '',
                  vehicleNumber: '',
                  licenseNumber: '',
                  address: '',
                  city: '',
                  state: '',
                  pincode: '',
                  workingHours: {
                    startTime: '',
                    endTime: ''
                  },
                  workingDays: [],
                  emergencyContact: {
                    name: '',
                    phoneNumber: '',
                    relationship: ''
                  }
                });
                setFormErrors({});
              }}
            >
              Reset Form
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Add Agent'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );

  // Effect for performance data
  useEffect(() => {
    if (activeTab === 'performance') {
      fetchPerformanceData();
    }
  }, [activeTab, fetchPerformanceData]);

  const renderPerformance = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Top Performers Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {performanceData.slice(0, 3).map((agent, index) => (
            <Card key={agent._id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-500' : 'bg-orange-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold">{agent.agentName}</h4>
                    <p className="text-sm text-secondary-600">{agent.agentId}</p>
                  </div>
                </div>
                <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>
                  {agent.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Total Deliveries</span>
                  <span className="font-semibold">{agent.totalDeliveries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Success Rate</span>
                  <span className="font-semibold text-green-600">{agent.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Rating</span>
                  <div className="flex items-center">
                    <span className="font-semibold mr-1">{agent.averageRating}</span>
                    <i className="fas fa-star text-yellow-500 text-sm"></i>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Performance Table */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">All Agents Performance</h3>
            <Button 
              onClick={fetchPerformanceData}
              variant="outline"
              size="sm"
              disabled={loadingPerformance}
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </Button>
          </div>

          {loadingPerformance ? (
            <div className="text-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-secondary-200">
                    <th className="py-3 px-4 font-semibold text-secondary-700">Agent</th>
                    <th className="py-3 px-4 font-semibold text-secondary-700">Branch</th>
                    <th className="py-3 px-4 font-semibold text-secondary-700">Vehicle</th>
                    <th className="py-3 px-4 font-semibold text-secondary-700">Total Deliveries</th>
                    <th className="py-3 px-4 font-semibold text-secondary-700">Successful</th>
                    <th className="py-3 px-4 font-semibold text-secondary-700">Failed</th>
                    <th className="py-3 px-4 font-semibold text-secondary-700">Success Rate</th>
                    <th className="py-3 px-4 font-semibold text-secondary-700">Rating</th>
                    <th className="py-3 px-4 font-semibold text-secondary-700">Status</th>
                    <th className="py-3 px-4 font-semibold text-secondary-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((agent) => (
                    <tr key={agent._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{agent.agentName}</p>
                          <p className="text-sm text-secondary-600">{agent.agentId}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{agent.assignedBranch}</td>
                      <td className="py-3 px-4 capitalize">{agent.vehicleType}</td>
                      <td className="py-3 px-4 font-semibold">{agent.totalDeliveries}</td>
                      <td className="py-3 px-4 text-green-600 font-semibold">{agent.successfulDeliveries}</td>
                      <td className="py-3 px-4 text-red-600 font-semibold">{agent.failedDeliveries}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span className="font-semibold mr-2">{agent.successRate.toFixed(1)}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(agent.successRate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span className="font-semibold mr-1">{agent.averageRating || 0}</span>
                          <i className="fas fa-star text-yellow-500 text-sm"></i>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={agent.status === 'active' ? 'success' : agent.status === 'inactive' ? 'danger' : 'warning'}>
                          {agent.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                                                     <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => {
                               setSelectedAgent(agent);
                               setActiveTab('consignments');
                             }}
                           >
                             <i className="fas fa-eye mr-1"></i>
                             View
                           </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    );
  };

  const renderManageAgents = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Search and Filter */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search agents by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Agents Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-secondary-200">
                <th className="py-3 px-4 font-semibold text-secondary-700">Agent ID</th>
                <th className="py-3 px-4 font-semibold text-secondary-700">Name</th>
                <th className="py-3 px-4 font-semibold text-secondary-700">Email</th>
                <th className="py-3 px-4 font-semibold text-secondary-700">Branch</th>
                <th className="py-3 px-4 font-semibold text-secondary-700">Vehicle</th>
                <th className="py-3 px-4 font-semibold text-secondary-700">Status</th>
                <th className="py-3 px-4 font-semibold text-secondary-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : paginatedAgents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-secondary-500">
                    No agents found
                  </td>
                </tr>
              ) : (
                paginatedAgents.map((agent) => (
                  <tr key={agent._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                    <td className="py-3 px-4 font-mono text-sm">{agent.agentId}</td>
                    <td className="py-3 px-4">{agent.agentName}</td>
                    <td className="py-3 px-4 text-sm">{agent.agentEmail}</td>
                    <td className="py-3 px-4">{agent.assignedBranch}</td>
                    <td className="py-3 px-4 capitalize">{agent.vehicleType}</td>
                    <td className="py-3 px-4">
                      <Badge variant={agent.status === 'active' ? 'success' : agent.status === 'inactive' ? 'danger' : 'warning'}>
                        {agent.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedAgent(agent)}>
                          <i className="fas fa-eye mr-1"></i>
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <i className="fas fa-edit mr-1"></i>
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-secondary-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAgents.length)} of {filteredAgents.length} agents
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i + 1}
                  size="sm"
                  variant={currentPage === i + 1 ? 'primary' : 'outline'}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );

  // Effect for consignments data
  useEffect(() => {
    if (selectedAgent?._id && activeTab === 'consignments') {
      fetchConsignments(selectedAgent._id, consignmentStatus, consignmentPage);
    }
  }, [selectedAgent, consignmentStatus, consignmentPage, activeTab, fetchConsignments]);

  const renderConsignments = () => {

    if (!selectedAgent) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="p-6">
            <div className="text-center py-8">
              <i className="fas fa-user-circle text-6xl text-secondary-300 mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">Select an Agent</h3>
              <p className="text-secondary-600 mb-4">Choose an agent from the performance tab to view their consignments</p>
              <Button onClick={() => setActiveTab('performance')} variant="outline">
                <i className="fas fa-chart-bar mr-2"></i>
                Go to Performance
              </Button>
            </div>
          </Card>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Agent Info Header */}
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-2xl"></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedAgent.agentName}</h2>
                <p className="text-blue-100">Agent ID: {selectedAgent.agentId}</p>
                <p className="text-blue-100">Branch: {selectedAgent.assignedBranch}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{selectedAgent.totalDeliveries || 0}</div>
              <div className="text-blue-100">Total Deliveries</div>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <h3 className="text-xl font-semibold">Agent Consignments</h3>
            <div className="flex items-center space-x-4">
              <select
                value={consignmentStatus}
                onChange={(e) => {
                  setConsignmentStatus(e.target.value);
                  setConsignmentPage(1);
                }}
                className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Courier Pickup">Courier Pickup</option>
                <option value="Shipped">Shipped</option>
                <option value="Intransit">In Transit</option>
                <option value="Arrived at Destination">Arrived at Destination</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Pickup Failed">Pickup Failed</option>
                <option value="Delivery Failed">Delivery Failed</option>
              </select>
              <Button 
                onClick={() => fetchConsignments(selectedAgent._id, consignmentStatus, consignmentPage)}
                variant="outline"
                size="sm"
                disabled={loadingConsignments}
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Consignments Table */}
        <Card className="p-6">
          {loadingConsignments ? (
            <div className="text-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : consignmentData.consignments?.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-shipping-fast text-6xl text-secondary-300 mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">No Consignments Found</h3>
              <p className="text-secondary-600">This agent has no consignments with the selected status.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="py-3 px-4 font-semibold text-secondary-700">Ref Number</th>
                      <th className="py-3 px-4 font-semibold text-secondary-700">Sender</th>
                      <th className="py-3 px-4 font-semibold text-secondary-700">Recipient</th>
                      <th className="py-3 px-4 font-semibold text-secondary-700">Status</th>
                      <th className="py-3 px-4 font-semibold text-secondary-700">Expected Delivery</th>
                      <th className="py-3 px-4 font-semibold text-secondary-700">Actual Delivery</th>
                      <th className="py-3 px-4 font-semibold text-secondary-700">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consignmentData.consignments.map((consignment) => (
                      <tr key={consignment._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm font-semibold text-primary-600">
                            {consignment.refNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{consignment.senderName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{consignment.recipientName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant={
                              consignment.status === 'Delivered' ? 'success' :
                              consignment.status.includes('Failed') ? 'danger' :
                              consignment.status === 'Out for Delivery' ? 'warning' :
                              'primary'
                            }
                          >
                            {consignment.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {consignment.expectedDeliveryDate ? 
                            new Date(consignment.expectedDeliveryDate).toLocaleDateString() : 
                            'N/A'
                          }
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {consignment.actualDeliveryDate ? 
                            new Date(consignment.actualDeliveryDate).toLocaleDateString() : 
                            'Pending'
                          }
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(consignment.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {consignmentData.pagination?.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-secondary-600">
                    Showing {((consignmentData.pagination.currentPage - 1) * 10) + 1} to {Math.min(consignmentData.pagination.currentPage * 10, consignmentData.pagination.totalCount)} of {consignmentData.pagination.totalCount} consignments
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={consignmentData.pagination.currentPage === 1}
                      onClick={() => setConsignmentPage(consignmentPage - 1)}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: consignmentData.pagination.totalPages }, (_, i) => (
                      <Button
                        key={i + 1}
                        size="sm"
                        variant={consignmentData.pagination.currentPage === i + 1 ? 'primary' : 'outline'}
                        onClick={() => setConsignmentPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={consignmentData.pagination.currentPage === consignmentData.pagination.totalPages}
                      onClick={() => setConsignmentPage(consignmentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Quick Actions</h4>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" size="sm">
              <i className="fas fa-download mr-2"></i>
              Export Consignments
            </Button>
            <Button variant="outline" size="sm">
              <i className="fas fa-print mr-2"></i>
              Print Report
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab('performance')}
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Performance
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Header */}
      <section className="bg-white dark:bg-secondary-900 border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200">
              Delivery Agent Management
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400 mt-2">
              Manage delivery agents, track performance, and handle assignments
            </p>
          </motion.div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="bg-white dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 hover:border-secondary-300'
                }`}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'add' && renderAddAgent()}
            {activeTab === 'performance' && renderPerformance()}
            {activeTab === 'manage' && renderManageAgents()}
            {activeTab === 'consignments' && renderConsignments()}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};

export default DeliveryAgentManagement;