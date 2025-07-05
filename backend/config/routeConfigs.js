// Configuration objects for different route groups
// This eliminates repetitive route definitions and standardizes API patterns

const Courier = require('../models/Courier');
const Complaint = require('../models/Complaint');
const Branch = require('../models/Branch');
const DeliveryAgent = require('../models/DeliveryAgent');

// Courier routes configuration
const courierConfig = {
  model: Courier,
  populateFields: 'assignedAgent',
  searchFields: ['refNumber', 'senderName', 'recipientName', 'senderContactNumber', 'recipientContactNumber'],
  allowedUpdateFields: [
    'senderName', 'senderContactNumber', 'senderAddress', 'senderCity', 'senderState', 'senderPincode',
    'recipientName', 'recipientContactNumber', 'recipientAddress', 'recipientCity', 'recipientState', 'recipientPincode',
    'courierDescription', 'parcelWeight', 'parcelDimensionLength', 'parcelDimensionWidth', 'parcelDimensionHeight',
    'parcelPrice', 'status', 'assignedAgent', 'expectedDeliveryDate'
  ],
  statsConfig: {
    pickup: { 
      field: 'status', 
      values: 'Courier Pickup' 
    },
    inTransit: { 
      field: 'status', 
      values: ['Shipped', 'Intransit', 'Arrived at Destination', 'Out for Delivery'] 
    },
    delivered: { 
      field: 'status', 
      values: 'Delivered' 
    },
    failed: { 
      field: 'status', 
      values: ['Pickup Failed', 'Delivery Failed'] 
    }
  },
  customFilters: async (req) => {
    return {};
  },
  beforeCreate: async (data, req) => {
    // Auto-generate reference number if not provided
    if (!data.refNumber) {
      const lastCourier = await Courier.findOne({}, {}, { sort: { 'createdAt': -1 } });
      const lastRefNum = lastCourier?.refNumber || 'CMS000000';
      const newNum = parseInt(lastRefNum.replace('CMS', '')) + 1;
      data.refNumber = `CMS${newNum.toString().padStart(6, '0')}`;
    }
    return data;
  }
};

// Complaint routes configuration
const complaintConfig = {
  model: Complaint,
  populateFields: 'assignedTo',
  searchFields: ['ticketId', 'subject', 'customerName', 'customerEmail', 'customerMobileNumber'],
  allowedUpdateFields: [
    'subject', 'description', 'category', 'priority', 'status', 'assignedTo', 
    'resolution', 'resolutionType', 'customerSatisfaction', 'internalNotes'
  ],
  statsConfig: {
    open: { 
      field: 'status', 
      values: 'open' 
    },
    inProgress: { 
      field: 'status', 
      values: 'in_progress' 
    },
    resolved: { 
      field: 'status', 
      values: 'resolved' 
    },
    closed: { 
      field: 'status', 
      values: 'closed' 
    },
    overdue: {
      field: 'isOverdue',
      values: true
    }
  },
  // Note: beforeCreate and afterCreate removed since admins cannot create complaints
  // Complaint creation is only allowed through public API for customers
};

// Branch routes configuration
const branchConfig = {
  model: Branch,
  populateFields: '',
  searchFields: ['branchName', 'branchCode', 'branchCity', 'branchState', 'branchManager.name'],
  allowedUpdateFields: [
    'branchName', 'branchContactNumber', 'branchEmail', 'branchAddress', 'branchCity', 
    'branchState', 'branchPincode', 'branchCountry', 'branchManager', 'operatingHours',
    'capacity', 'services', 'status', 'coordinates'
  ],
  statsConfig: {
    active: { 
      field: 'status', 
      values: 'active' 
    },
    inactive: { 
      field: 'status', 
      values: 'inactive' 
    },
    maintenance: { 
      field: 'status', 
      values: 'maintenance' 
    }
  },
  beforeCreate: async (data, req) => {
    // Auto-generate branch code if not provided
    if (!data.branchCode) {
      const cityCode = data.branchCity.substring(0, 3).toUpperCase();
      const lastBranch = await Branch.findOne({ branchCode: { $regex: `^${cityCode}` } }, {}, { sort: { 'branchCode': -1 } });
      const lastNum = lastBranch?.branchCode ? parseInt(lastBranch.branchCode.slice(-3)) : 0;
      data.branchCode = `${cityCode}${(lastNum + 1).toString().padStart(3, '0')}`;
    }
    
    // Set default values
    if (!data.operatingHours?.workingDays) {
      data.operatingHours = {
        ...data.operatingHours,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      };
    }
    
    if (!data.services) {
      data.services = ['Standard Delivery', 'Express Delivery', 'COD'];
    }
    
    data.status = data.status || 'active';
    return data;
  }
};

// Delivery Agent routes configuration
const deliveryAgentConfig = {
  model: DeliveryAgent,
  populateFields: 'assignedBranch',
  searchFields: ['agentName', 'agentId', 'agentEmail', 'agentMobileNumber'],
  allowedUpdateFields: [
    'agentName', 'agentEmail', 'agentMobileNumber', 'agentAddress', 'agentCity', 
    'agentState', 'agentPincode', 'status', 'isAvailable', 'vehicleType', 
    'vehicleNumber', 'licenseNumber', 'assignedBranch'
  ],
  statsConfig: {
    active: { 
      field: 'status', 
      values: 'active' 
    },
    inactive: { 
      field: 'status', 
      values: 'inactive' 
    },
    suspended: { 
      field: 'status', 
      values: 'suspended' 
    },
    available: { 
      field: 'isAvailable', 
      values: true 
    },
    busy: { 
      field: 'isAvailable', 
      values: false 
    }
  },
  customFilters: async (req) => {
    return {};
  },
  beforeCreate: async (data, req) => {
    // Auto-generate agent ID if not provided
    if (!data.agentId) {
      const lastAgent = await DeliveryAgent.findOne({}, {}, { sort: { 'createdAt': -1 } });
      const lastIdNum = lastAgent?.agentId || 'AG000000';
      const newNum = parseInt(lastIdNum.replace('AG', '')) + 1;
      data.agentId = `AG${newNum.toString().padStart(6, '0')}`;
    }
    
    // Set default values
    data.status = data.status || 'active';
    data.isAvailable = data.isAvailable !== undefined ? data.isAvailable : true;
    return data;
  }
};

// Validation rules for each resource type
const validationRules = {
  courier: {
    create: [
      'senderName', 'senderContactNumber', 'senderAddress', 'senderCity', 'senderState', 'senderPincode',
      'recipientName', 'recipientContactNumber', 'recipientAddress', 'recipientCity', 'recipientState', 'recipientPincode',
      'courierDescription', 'parcelWeight'
    ],
    update: [] // Use allowedUpdateFields from config
  },
  complaint: {
    create: [], // Removed - admins cannot create complaints
    update: []
  },
  branch: {
    create: [
      'branchName', 'branchContactNumber', 'branchEmail', 'branchAddress', 'branchCity', 
      'branchState', 'branchPincode', 'branchCountry', 'branchManager.name', 
      'branchManager.contactNumber', 'branchManager.email'
    ],
    update: []
  },
  deliveryAgent: {
    create: ['agentName', 'agentEmail', 'agentMobileNumber', 'agentAddress'],
    update: []
  }
};

module.exports = {
  courierConfig,
  complaintConfig,
  branchConfig,
  deliveryAgentConfig,
  validationRules
}; 