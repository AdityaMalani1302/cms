// Configuration objects for different admin management pages
// This replaces multiple separate components with data-driven configurations

export const courierConfig = {
  title: 'Manage Couriers',
  description: 'Complete courier management system with advanced features',
  apiEndpoint: '/api/admin/couriers',
  searchEnabled: true,
  defaultSort: 'createdAt',
  emptyIcon: 'fa-box',
  
  statsCards: [
    { key: 'total', label: 'Total', color: 'blue', icon: 'fa-box' },
    { key: 'pickup', label: 'Pickup', color: 'yellow', icon: 'fa-clock' },
    { key: 'inTransit', label: 'In Transit', color: 'purple', icon: 'fa-truck' },
    { key: 'delivered', label: 'Delivered', color: 'green', icon: 'fa-check-circle' },
    { key: 'failed', label: 'Failed', color: 'red', icon: 'fa-exclamation-triangle' }
  ],

  filters: [
    {
      key: 'status',
      placeholder: 'Filter by Status',
      options: [
        { value: 'Courier Pickup', label: 'Pickup' },
        { value: 'Shipped', label: 'Shipped' },
        { value: 'Intransit', label: 'In Transit' },
        { value: 'Delivered', label: 'Delivered' },
        { value: 'Pickup Failed', label: 'Pickup Failed' },
        { value: 'Delivery Failed', label: 'Delivery Failed' }
      ]
    },
    {
      key: 'branch',
      placeholder: 'Filter by Branch',
      options: [] // Will be populated dynamically
    }
  ],

  columns: [
    { key: 'refNumber', label: 'Ref Number' },
    { key: 'senderName', label: 'Sender' },
    { key: 'recipientName', label: 'Recipient' },
    { 
      key: 'status', 
      label: 'Status',
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
          {item.status}
        </span>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Created',
      render: (item) => new Date(item.createdAt).toLocaleDateString()
    }
  ],

  features: {
    title: 'Comprehensive Courier Management System',
    description: 'Advanced tools for managing courier operations with real-time tracking and analytics',
    highlights: [
      {
        title: 'Advanced Search',
        description: 'Search by tracking number, customer name, or location',
        icon: 'fa-search',
        color: 'blue'
      },
      {
        title: 'Smart Filters',
        description: 'Filter by status, branch, date range, and priority',
        icon: 'fa-filter',
        color: 'green'
      },
      {
        title: 'Real-time Tracking',
        description: 'Live location updates and delivery progress',
        icon: 'fa-route',
        color: 'purple'
      },
      {
        title: 'Bulk Operations',
        description: 'Manage multiple couriers simultaneously',
        icon: 'fa-cogs',
        color: 'orange'
      }
    ],
    capabilities: [
      'Create and edit courier records',
      'Assign delivery agents automatically',
      'Track delivery status in real-time',
      'Generate delivery reports',
      'Handle failed delivery cases',
      'Manage customer notifications',
      'Export data to various formats',
      'Integration with payment systems',
      'Route optimization for agents'
    ]
  },

  actions: {
    create: {
      type: 'create',
      label: 'Add New Courier',
      icon: 'fa-plus',
      successMessage: 'Courier created successfully',
      errorMessage: 'Failed to create courier'
    },
    edit: {
      type: 'update',
      label: 'Edit',
      icon: 'fa-edit',
      className: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      successMessage: 'Courier updated successfully'
    },
    delete: {
      type: 'delete',
      label: 'Delete',
      icon: 'fa-trash',
      className: 'bg-red-100 text-red-700 hover:bg-red-200',
      successMessage: 'Courier deleted successfully'
    },
    assign: {
      type: 'custom',
      label: 'Assign',
      icon: 'fa-user-plus',
      className: 'bg-green-100 text-green-700 hover:bg-green-200',
      customHandler: async (item, token) => {
        // Custom assignment logic
      }
    }
  }
};

export const complaintConfig = {
  title: 'Manage Complaints',
  description: 'Advanced complaint management with SLA tracking and resolution workflows',
  apiEndpoint: '/api/admin/complaints',
  searchEnabled: true,
  defaultSort: 'createdAt',
  emptyIcon: 'fa-ticket-alt',

  statsCards: [
    { key: 'total', label: 'Total', color: 'blue', icon: 'fa-ticket-alt' },
    { key: 'open', label: 'Open', color: 'red', icon: 'fa-exclamation-circle' },
    { key: 'inProgress', label: 'In Progress', color: 'yellow', icon: 'fa-clock' },
    { key: 'resolved', label: 'Resolved', color: 'green', icon: 'fa-check-circle' },
    { key: 'closed', label: 'Closed', color: 'gray', icon: 'fa-times-circle' },
    { key: 'overdue', label: 'Overdue', color: 'orange', icon: 'fa-exclamation-triangle' }
  ],

  filters: [
    {
      key: 'status',
      placeholder: 'Filter by Status',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' }
      ]
    },
    {
      key: 'priority',
      placeholder: 'Filter by Priority',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
      ]
    }
  ],

  columns: [
    { key: 'ticketId', label: 'Ticket ID' },
    { key: 'subject', label: 'Subject' },
    { 
      key: 'priority', 
      label: 'Priority',
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
          {item.priority?.toUpperCase()}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
          {item.status?.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Created',
      render: (item) => new Date(item.createdAt).toLocaleDateString()
    }
  ],

  features: {
    title: 'Advanced Complaint Management System',
    description: 'Comprehensive tools for tracking, managing, and resolving customer complaints with SLA monitoring',
    highlights: [
      {
        title: 'SLA Monitoring',
        description: 'Track response and resolution times with alerts',
        icon: 'fa-bell',
        color: 'red'
      },
      {
        title: 'Assignment System',
        description: 'Auto-assign or manually assign to team members',
        icon: 'fa-users',
        color: 'green'
      },
      {
        title: 'Communication Hub',
        description: 'Centralized communication history and notes',
        icon: 'fa-comments',
        color: 'purple'
      },
      {
        title: 'Analytics Dashboard',
        description: 'Detailed reports and performance metrics',
        icon: 'fa-chart-line',
        color: 'orange'
      }
    ],
    capabilities: [
      'Priority-based categorization',
      'Automated escalation workflows',
      'Customer satisfaction tracking',
      'Resolution type classification',
      'Attachment and file management',
      'Email and SMS notifications',
      'Bulk operations and filters',
      'Custom SLA configurations',
      'Integration with courier tracking',
      'Detailed audit trails',
      'Performance analytics',
      'Customer feedback collection'
    ]
  },

  actions: {
    edit: {
      type: 'update',
      label: 'Edit',
      icon: 'fa-edit',
      className: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    },
    resolve: {
      type: 'custom',
      label: 'Resolve',
      icon: 'fa-check',
      className: 'bg-green-100 text-green-700 hover:bg-green-200'
    },
    assign: {
      type: 'custom',
      label: 'Assign',
      icon: 'fa-user-plus',
      className: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    }
  }
};

export const branchConfig = {
  title: 'Manage Branches',
  description: 'Comprehensive branch management with performance monitoring and staff allocation',
  apiEndpoint: '/api/admin/branches',
  searchEnabled: true,
  defaultSort: 'createdAt',
  emptyIcon: 'fa-building',

  statsCards: [
    { key: 'total', label: 'Total Branches', color: 'blue', icon: 'fa-building' },
    { key: 'active', label: 'Active', color: 'green', icon: 'fa-check-circle' },
    { key: 'inactive', label: 'Inactive', color: 'red', icon: 'fa-times-circle' },
    { key: 'maintenance', label: 'Maintenance', color: 'yellow', icon: 'fa-wrench' }
  ],

  filters: [
    {
      key: 'status',
      placeholder: 'Filter by Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'maintenance', label: 'Maintenance' }
      ]
    },
    {
      key: 'city',
      placeholder: 'Filter by City',
      options: [] // Will be populated dynamically
    }
  ],

  columns: [
    { key: 'branchCode', label: 'Branch Code' },
    { key: 'branchName', label: 'Branch Name' },
    { key: 'branchCity', label: 'City' },
    { key: 'branchManager.name', label: 'Manager' },
    { 
      key: 'status', 
      label: 'Status',
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
          {item.status?.toUpperCase()}
        </span>
      )
    }
  ],

  features: {
    title: 'Complete Branch Management System',
    description: 'Advanced tools for managing branch operations, staff, and performance monitoring',
    highlights: [
      {
        title: 'Performance Tracking',
        description: 'Monitor branch performance metrics and KPIs',
        icon: 'fa-chart-bar',
        color: 'blue'
      },
      {
        title: 'Staff Management',
        description: 'Manage branch staff, roles, and assignments',
        icon: 'fa-users',
        color: 'green'
      },
      {
        title: 'Operational Hours',
        description: 'Configure working hours and holiday schedules',
        icon: 'fa-clock',
        color: 'purple'
      },
      {
        title: 'Service Coverage',
        description: 'Define service areas and delivery zones',
        icon: 'fa-map-marked-alt',
        color: 'orange'
      }
    ],
    capabilities: [
      'Branch registration and management',
      'Manager assignment and roles',
      'Operating hours configuration',
      'Service area definitions',
      'Staff allocation tracking',
      'Performance analytics',
      'Revenue tracking',
      'Inventory management',
      'Customer feedback monitoring'
    ]
  },

  actions: {
    create: {
      type: 'create',
      label: 'Add New Branch',
      icon: 'fa-plus'
    },
    edit: {
      type: 'update',
      label: 'Edit',
      icon: 'fa-edit',
      className: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    },
    activate: {
      type: 'custom',
      label: 'Activate',
      icon: 'fa-power-off',
      className: 'bg-green-100 text-green-700 hover:bg-green-200'
    },
    deactivate: {
      type: 'custom',
      label: 'Deactivate',
      icon: 'fa-ban',
      className: 'bg-red-100 text-red-700 hover:bg-red-200'
    }
  }
};

export const agentConfig = {
  title: 'Manage Delivery Agents',
  description: 'Complete delivery agent management with performance tracking and assignment workflows',
  apiEndpoint: '/api/admin/delivery-agents',
  searchEnabled: true,
  defaultSort: 'createdAt',
  emptyIcon: 'fa-user-tie',

  statsCards: [
    { key: 'total', label: 'Total Agents', color: 'blue', icon: 'fa-users' },
    { key: 'active', label: 'Active', color: 'green', icon: 'fa-user-check' },
    { key: 'available', label: 'Available', color: 'purple', icon: 'fa-user-clock' },
    { key: 'busy', label: 'Busy', color: 'yellow', icon: 'fa-user-times' },
    { key: 'offline', label: 'Offline', color: 'red', icon: 'fa-user-slash' }
  ],

  filters: [
    {
      key: 'status',
      placeholder: 'Filter by Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' }
      ]
    },
    {
      key: 'availability',
      placeholder: 'Filter by Availability',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'busy', label: 'Busy' },
        { value: 'offline', label: 'Offline' }
      ]
    }
  ],

  columns: [
    { key: 'agentId', label: 'Agent ID' },
    { key: 'agentName', label: 'Agent Name' },
    { key: 'agentEmail', label: 'Email' },
    { key: 'agentMobileNumber', label: 'Mobile' },
    { 
      key: 'status', 
      label: 'Status',
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
          {item.status?.toUpperCase()}
        </span>
      )
    },
    { 
      key: 'isAvailable', 
      label: 'Availability',
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {item.isAvailable ? 'Available' : 'Busy'}
        </span>
      )
    }
  ],

  actions: {
    create: {
      type: 'create',
      label: 'Add New Agent',
      icon: 'fa-user-plus'
    },
    edit: {
      type: 'update',
      label: 'Edit',
      icon: 'fa-edit',
      className: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    },
    activate: {
      type: 'custom',
      label: 'Activate',
      icon: 'fa-user-check',
      className: 'bg-green-100 text-green-700 hover:bg-green-200'
    },
    suspend: {
      type: 'custom',
      label: 'Suspend',
      icon: 'fa-user-times',
      className: 'bg-red-100 text-red-700 hover:bg-red-200'
    }
  }
};

// Helper functions for styling
const getStatusColor = (status) => {
  const statusColors = {
    'Courier Pickup': 'bg-yellow-100 text-yellow-800',
    'Shipped': 'bg-blue-100 text-blue-800',
    'Intransit': 'bg-purple-100 text-purple-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Pickup Failed': 'bg-red-100 text-red-800',
    'Delivery Failed': 'bg-red-100 text-red-800',
    'active': 'bg-green-100 text-green-800',
    'inactive': 'bg-red-100 text-red-800',
    'maintenance': 'bg-yellow-100 text-yellow-800',
    'open': 'bg-red-100 text-red-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'resolved': 'bg-green-100 text-green-800',
    'closed': 'bg-gray-100 text-gray-800'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

const getPriorityColor = (priority) => {
  const priorityColors = {
    'low': 'bg-green-100 text-green-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'high': 'bg-orange-100 text-orange-800',
    'urgent': 'bg-red-100 text-red-800'
  };
  return priorityColors[priority] || 'bg-gray-100 text-gray-800';
}; 