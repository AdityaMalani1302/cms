import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import { safeStringValue } from '../../utils/formHelpers';

const DataManager = ({ config }) => {
  const [stats, setStats] = useState({});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 10,
    sortBy: config.defaultSort || 'createdAt',
    sortOrder: 'desc',
    ...config.defaultFilters
  });

  useEffect(() => {
    fetchData();
  }, [filters, config.apiEndpoint]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('adminToken');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${config.apiEndpoint}?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setData(response.data.data || []);
        setStats(response.data.stats || {});
      }
    } catch (error) {
      console.error(`Fetch ${config.title} error:`, error);
      toast.error(`Failed to fetch ${config.title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, item = null) => {
    try {
      // If action has custom onClick function, use it directly
      if (action.onClick) {
        action.onClick(item);
        return;
      }

      const token = sessionStorage.getItem('adminToken');
      let response;

      switch (action.type) {
        case 'create':
          response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${config.apiEndpoint}`,
            action.data,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case 'update':
          response = await axios.put(
            `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${config.apiEndpoint}/${item._id}`,
            action.data,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case 'delete':
          response = await axios.delete(
            `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${config.apiEndpoint}/${item._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        default:
          if (action.customHandler) {
            await action.customHandler(item, token);
          }
      }

      if (response?.data.success) {
        toast.success(action.successMessage || `${action.type} completed successfully`);
        fetchData();
      }
    } catch (error) {
      console.error(`${action.type} error:`, error);
      toast.error(action.errorMessage || `Failed to ${action.type}`);
    }
  };

  // Safe value renderer function
  const safeRenderValue = (item, columnKey) => {
    const value = item[columnKey];
    
    // Return safe string representation
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (typeof value === 'object') {
      // Handle specific object types
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : '-';
      }
      
      // For other objects, try to extract meaningful data
      if (value.toString && value.toString() !== '[object Object]') {
        return value.toString();
      }
      
      // Fallback: return empty dash for objects
      return '-';
    }
    
    return safeStringValue(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {config.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {config.description}
              </p>
            </div>
            {config.actions?.create && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAction(config.actions.create)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <i className={`fas ${config.actions.create.icon || 'fa-plus'} mr-2`}></i>
                {config.actions.create.label || 'Add New'}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        {config.statsCards && (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${config.statsCards.length} gap-6 mb-8`}>
            {config.statsCards.map((statConfig, index) => (
              <motion.div
                key={statConfig.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{statConfig.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats[statConfig.key] || 0}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg bg-${statConfig.color}-100`}>
                    <i className={`fas ${statConfig.icon} text-${statConfig.color}-600 text-xl`}></i>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* Feature Overview */}
          {config.features && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {config.features.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {config.features.description}
                </p>
              </div>
              
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${config.features.highlights?.length || 4} gap-6 mb-8`}>
                {config.features.highlights?.map((highlight, index) => (
                  <div key={index} className={`p-6 bg-${highlight.color}-50 dark:bg-${highlight.color}-900/20 rounded-xl text-center`}>
                    <div className={`w-16 h-16 bg-${highlight.color}-500 rounded-xl flex items-center justify-center mx-auto mb-4`}>
                      <i className={`fas ${highlight.icon} text-white text-2xl`}></i>
                    </div>
                    <h3 className={`font-semibold text-${highlight.color}-900 dark:text-${highlight.color}-300 mb-2`}>{highlight.title}</h3>
                    <p className={`text-sm text-${highlight.color}-700 dark:text-${highlight.color}-400`}>{highlight.description}</p>
                  </div>
                ))}
              </div>

              {config.features.capabilities && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">
                    {config.features.capabilitiesTitle || 'System Capabilities'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {config.features.capabilities.map((capability, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center p-3 bg-white dark:bg-gray-600 rounded-lg"
                      >
                        <i className="fas fa-check-circle text-green-500 mr-3 text-lg"></i>
                        <span className="text-gray-700 dark:text-gray-300">{capability}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Data Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="mt-8">
              {/* Search and Filters */}
              {config.searchEnabled && (
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={`Search ${config.title.toLowerCase()}...`}
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  {config.filters?.map((filter, index) => (
                    <select
                      key={index}
                      value={filters[filter.key] || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, [filter.key]: e.target.value, page: 1 }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">{filter.placeholder}</option>
                      {filter.options.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ))}
                </div>
              )}

              {/* Data Display */}
              {data.length === 0 ? (
                <div className="text-center py-12">
                  <i className={`fas ${config.emptyIcon || 'fa-inbox'} text-6xl text-gray-400 mb-4`}></i>
                  <p className="text-gray-500 text-lg">No {config.title.toLowerCase()} found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {config.columns?.map((column, index) => (
                          <th
                            key={index}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            {column.label}
                          </th>
                        ))}
                        {config.actions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {data.map((item, index) => (
                        <tr key={item._id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          {config.columns?.map((column, colIndex) => (
                            <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                              {column.render ? column.render(item) : safeRenderValue(item, column.key)}
                            </td>
                          ))}
                          {config.actions && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              {Object.entries(config.actions).filter(([key]) => key !== 'create').map(([actionKey, action]) => {
                                // Check if action has condition and should be shown
                                if (action.condition && !action.condition(item)) {
                                  return null;
                                }
                                
                                return (
                                  <button
                                    key={actionKey}
                                    onClick={() => handleAction(action, item)}
                                    className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${action.className || 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                  >
                                    {action.icon && <i className={`fas ${action.icon} mr-1`}></i>}
                                    {action.label}
                                  </button>
                                );
                              })}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataManager; 