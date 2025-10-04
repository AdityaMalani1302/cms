import React from 'react';

const TrackingTimeline = ({ tracking = [] }) => {
  const getStatusIcon = (status) => {
    const baseClasses = "w-4 h-4 rounded-full border-2";
    
    switch (status) {
      case 'Delivered':
        return `${baseClasses} bg-green-500 border-green-500`;
      case 'Out for Delivery':
        return `${baseClasses} bg-blue-500 border-blue-500`;
      case 'Intransit':
        return `${baseClasses} bg-yellow-500 border-yellow-500`;
      case 'Courier Pickup':
        return `${baseClasses} bg-purple-500 border-purple-500`;
      default:
        return `${baseClasses} bg-gray-300 border-gray-300`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  if (!tracking || tracking.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No tracking information available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Tracking Timeline</h3>
      
      <div className="relative">
        {tracking.map((item, index) => (
          <div key={index} className="flex items-start space-x-3 mb-4">
            <div className={`flex-shrink-0 mt-1 ${getStatusIcon(item.status)}`}></div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.status}
                  </p>
                  {item.location && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.location}
                    </p>
                  )}
                  {item.remark && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {item.remark}
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(item.timestamp || item.date)}
                  </p>
                </div>
              </div>
            </div>
            
            {index < tracking.length - 1 && (
              <div className="absolute left-2 w-0.5 h-8 bg-gray-200 dark:bg-gray-600" 
                   style={{ top: `${(index + 1) * 4}rem` }}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackingTimeline;