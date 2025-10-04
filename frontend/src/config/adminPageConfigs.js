// Simplified Configuration objects for admin management pages
// Streamlined approach with essential features only

export const courierConfig = {
  title: 'Manage Couriers',
  description: 'Courier management with tracking and status updates',
  apiEndpoint: '/api/admin/couriers',
  searchEnabled: true,
  defaultSort: 'createdAt',
  
  statsCards: [
    { key: 'total', label: 'Total', color: 'blue', icon: 'fa-box' },
    { key: 'pickup', label: 'Pickup', color: 'yellow', icon: 'fa-clock' },
    { key: 'inTransit', label: 'In Transit', color: 'purple', icon: 'fa-truck' },
    { key: 'delivered', label: 'Delivered', color: 'green', icon: 'fa-check-circle' }
  ],

  filters: [
    {
      key: 'status',
      placeholder: 'Filter by Status',
      options: [
        { value: 'Courier Pickup', label: 'Pickup' },
        { value: 'Shipped', label: 'Shipped' },
        { value: 'Intransit', label: 'In Transit' },
        { value: 'Delivered', label: 'Delivered' }
      ]
    }
  ],

  columns: [
    { key: 'refNumber', label: 'Ref Number' },
    { key: 'senderName', label: 'Sender' },
    { key: 'recipientName', label: 'Recipient' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created' }
  ]
};

export const complaintConfig = {
  title: 'Manage Complaints',
  description: 'Complaint management and resolution tracking',
  apiEndpoint: '/api/admin/complaints',
  searchEnabled: true,
  defaultSort: 'createdAt',

  statsCards: [
    { key: 'total', label: 'Total', color: 'blue', icon: 'fa-ticket-alt' },
    { key: 'open', label: 'Open', color: 'red', icon: 'fa-exclamation-circle' },
    { key: 'resolved', label: 'Resolved', color: 'green', icon: 'fa-check-circle' }
  ],

  filters: [
    {
      key: 'status',
      placeholder: 'Filter by Status',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolved' }
      ]
    }
  ],

  columns: [
    { key: 'ticketId', label: 'Ticket ID' },
    { key: 'subject', label: 'Subject' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created' }
  ]
};

export const queryConfig = {
  title: 'Manage Queries',
  description: 'Customer queries and contact messages from the website',
  apiEndpoint: '/api/admin/queries',
  searchEnabled: true,
  defaultSort: 'createdAt',

  statsCards: [
    { key: 'total', label: 'Total Queries', color: 'blue', icon: 'fa-envelope' },
    { key: 'unread', label: 'Unread', color: 'yellow', icon: 'fa-envelope-open' },
    { key: 'replied', label: 'Replied', color: 'green', icon: 'fa-reply' },
    { key: 'pending', label: 'Pending', color: 'red', icon: 'fa-clock' }
  ],

  filters: [
    {
      key: 'status',
      placeholder: 'Filter by Status',
      options: [
        { value: 'unread', label: 'Unread' },
        { value: 'read', label: 'Read' },
        { value: 'replied', label: 'Replied' },
        { value: 'pending', label: 'Pending' }
      ]
    }
  ],

  columns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Received' }
  ]
};

export const branchConfig = {
  title: 'Manage Branches',
  description: 'Branch locations and contact information',
  apiEndpoint: '/api/admin/branches',
  searchEnabled: true,
  defaultSort: 'name',

  columns: [
    { key: 'name', label: 'Branch Name' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'contactNumber', label: 'Contact' }
  ]
};

export const userConfig = {
  title: 'User Management',
  description: 'Manage customer accounts and user information',
  apiEndpoint: '/api/admin/users',
  searchEnabled: true,
  defaultSort: 'createdAt',
  
  statsCards: [
    { key: 'totalUsers', label: 'Total Users', color: 'blue', icon: 'fa-users' },
    { key: 'activeUsers', label: 'Active', color: 'green', icon: 'fa-user-check' },
    { key: 'inactiveUsers', label: 'Inactive', color: 'red', icon: 'fa-user-times' },
    { key: 'newUsersThisMonth', label: 'New This Month', color: 'purple', icon: 'fa-user-plus' }
  ],

  filters: [
    {
      key: 'status',
      placeholder: 'Filter by Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      key: 'authProvider',
      placeholder: 'Filter by Provider',
      options: [
        { value: 'local', label: 'Local' },
        { value: 'google', label: 'Google' },
        { value: 'clerk', label: 'Clerk' }
      ]
    }
  ],

  columns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phoneNumber', label: 'Phone' },
    { key: 'authProvider', label: 'Provider' },
    { key: 'isActive', label: 'Status' },
    { key: 'createdAt', label: 'Joined' }
  ]
};

// Utility functions for rendering
export const getStatusColor = (status) => {
  const statusColors = {
    'Courier Pickup': 'bg-yellow-100 text-yellow-800',
    'Shipped': 'bg-blue-100 text-blue-800',
    'Intransit': 'bg-purple-100 text-purple-800',
    'Delivered': 'bg-green-100 text-green-800',
    'open': 'bg-red-100 text-red-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'resolved': 'bg-green-100 text-green-800'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

export const getPriorityColor = (priority) => {
  const priorityColors = {
    'low': 'bg-green-100 text-green-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'high': 'bg-orange-100 text-orange-800',
    'urgent': 'bg-red-100 text-red-800'
  };
  return priorityColors[priority] || 'bg-gray-100 text-gray-800';
}; 