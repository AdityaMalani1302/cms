/**
 * Status utilities for consistent status handling across the application
 */

// Standardized status values for the entire system
export const STATUS_VALUES = {
  PENDING_PICKUP: 'pending pickup',
  PICKED_UP: 'picked up',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in transit',
  ARRIVED_AT_DESTINATION: 'arrived at destination',
  OUT_FOR_DELIVERY: 'out for delivery',
  DELIVERED: 'delivered',
  PICKUP_FAILED: 'pickup failed',
  DELIVERY_FAILED: 'delivery failed'
};

// Human-friendly status labels for display
export const STATUS_LABELS = {
  [STATUS_VALUES.PENDING_PICKUP]: 'Pending Pickup',
  [STATUS_VALUES.PICKED_UP]: 'Picked Up',
  [STATUS_VALUES.SHIPPED]: 'Shipped',
  [STATUS_VALUES.IN_TRANSIT]: 'In Transit',
  [STATUS_VALUES.ARRIVED_AT_DESTINATION]: 'Arrived at Destination',
  [STATUS_VALUES.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [STATUS_VALUES.DELIVERED]: 'Delivered',
  [STATUS_VALUES.PICKUP_FAILED]: 'Pickup Failed',
  [STATUS_VALUES.DELIVERY_FAILED]: 'Delivery Failed'
};

// Status descriptions for tracking timeline
export const STATUS_DESCRIPTIONS = {
  [STATUS_VALUES.PENDING_PICKUP]: 'Your package is confirmed and pickup is scheduled',
  [STATUS_VALUES.PICKED_UP]: 'Your package has been picked up from the sender',
  [STATUS_VALUES.SHIPPED]: 'Your package has been shipped from origin',
  [STATUS_VALUES.IN_TRANSIT]: 'Your package is in transit to destination',
  [STATUS_VALUES.ARRIVED_AT_DESTINATION]: 'Your package has arrived at destination facility',
  [STATUS_VALUES.OUT_FOR_DELIVERY]: 'Your package is out for delivery',
  [STATUS_VALUES.DELIVERED]: 'Your package has been delivered successfully',
  [STATUS_VALUES.PICKUP_FAILED]: 'Pickup attempt failed - we will retry',
  [STATUS_VALUES.DELIVERY_FAILED]: 'Delivery attempt failed - we will retry'
};

// Status colors for UI components
export const STATUS_COLORS = {
  [STATUS_VALUES.PENDING_PICKUP]: 'bg-yellow-100 text-yellow-800',
  [STATUS_VALUES.PICKED_UP]: 'bg-blue-100 text-blue-800',
  [STATUS_VALUES.SHIPPED]: 'bg-blue-100 text-blue-800',
  [STATUS_VALUES.IN_TRANSIT]: 'bg-purple-100 text-purple-800',
  [STATUS_VALUES.ARRIVED_AT_DESTINATION]: 'bg-indigo-100 text-indigo-800',
  [STATUS_VALUES.OUT_FOR_DELIVERY]: 'bg-orange-100 text-orange-800',
  [STATUS_VALUES.DELIVERED]: 'bg-green-100 text-green-800',
  [STATUS_VALUES.PICKUP_FAILED]: 'bg-red-100 text-red-800',
  [STATUS_VALUES.DELIVERY_FAILED]: 'bg-red-100 text-red-800'
};

/**
 * Get all valid status values
 */
export const getValidStatuses = () => {
  return Object.values(STATUS_VALUES);
};

/**
 * Get human-friendly label for a status
 */
export const getStatusLabel = (status) => {
  return STATUS_LABELS[status] || status;
};

/**
 * Get status description
 */
export const getStatusDescription = (status) => {
  return STATUS_DESCRIPTIONS[status] || `Status: ${status}`;
};

/**
 * Get status color classes
 */
export const getStatusColor = (status) => {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Convert old status values to new standardized values
 * For backward compatibility
 */
export const migrateStatus = (oldStatus) => {
  const migration = {
    'Courier Pickup': STATUS_VALUES.PENDING_PICKUP,
    'Pickup': STATUS_VALUES.PENDING_PICKUP,
    'Picked Up': STATUS_VALUES.PICKED_UP,
    'Shipped': STATUS_VALUES.SHIPPED,
    'Intransit': STATUS_VALUES.IN_TRANSIT,
    'In Transit': STATUS_VALUES.IN_TRANSIT,
    'Arrived at Destination': STATUS_VALUES.ARRIVED_AT_DESTINATION,
    'Out for Delivery': STATUS_VALUES.OUT_FOR_DELIVERY,
    'Delivered': STATUS_VALUES.DELIVERED,
    'Pickup Failed': STATUS_VALUES.PICKUP_FAILED,
    'Delivery Failed': STATUS_VALUES.DELIVERY_FAILED
  };
  
  return migration[oldStatus] || oldStatus;
};

/**
 * Check if a status is a terminal status (no further updates expected)
 */
export const isTerminalStatus = (status) => {
  return [
    STATUS_VALUES.DELIVERED,
    STATUS_VALUES.PICKUP_FAILED,
    STATUS_VALUES.DELIVERY_FAILED
  ].includes(status);
};

/**
 * Get the next possible statuses for a given current status
 */
export const getNextStatuses = (currentStatus) => {
  const transitions = {
    [STATUS_VALUES.PENDING_PICKUP]: [STATUS_VALUES.PICKED_UP, STATUS_VALUES.PICKUP_FAILED],
    [STATUS_VALUES.PICKED_UP]: [STATUS_VALUES.SHIPPED],
    [STATUS_VALUES.SHIPPED]: [STATUS_VALUES.IN_TRANSIT],
    [STATUS_VALUES.IN_TRANSIT]: [STATUS_VALUES.ARRIVED_AT_DESTINATION],
    [STATUS_VALUES.ARRIVED_AT_DESTINATION]: [STATUS_VALUES.OUT_FOR_DELIVERY],
    [STATUS_VALUES.OUT_FOR_DELIVERY]: [STATUS_VALUES.DELIVERED, STATUS_VALUES.DELIVERY_FAILED],
    [STATUS_VALUES.PICKUP_FAILED]: [STATUS_VALUES.PENDING_PICKUP],
    [STATUS_VALUES.DELIVERY_FAILED]: [STATUS_VALUES.OUT_FOR_DELIVERY]
  };
  
  return transitions[currentStatus] || [];
};