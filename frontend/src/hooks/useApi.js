import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Base API configuration
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Request cache and deduplication
const requestCache = new Map();
const pendingRequests = new Map();

// Create axios instance with optimized defaults
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request deduplication helper
const generateRequestKey = (config) => {
  const { method = 'GET', url, params, data } = config;
  return `${method.toUpperCase()}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`;
};

// Enhanced request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token automatically
        const token = sessionStorage.getItem('adminToken') ||
      sessionStorage.getItem('customerToken') ||
      sessionStorage.getItem('agentToken') ||
      sessionStorage.getItem('deliveryAgentToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp for debugging
    config.metadata = { requestStartTime: Date.now() };
    
    // Request deduplication for GET requests
    if (config.method === 'get') {
      const requestKey = generateRequestKey(config);
      
      // Check if there's a pending identical request
      if (pendingRequests.has(requestKey)) {
        config.cancelToken = new axios.CancelToken((cancel) => {
          cancel('Duplicate request cancelled');
        });
      } else {
        pendingRequests.set(requestKey, config);
      }
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with retry logic and caching
apiClient.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = Date.now() - response.config.metadata.requestStartTime;
    
    // Log slow requests in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`Slow API request detected: ${response.config.url} took ${duration}ms`);
    }

    // Cache successful GET requests
    if (response.config.method === 'get' && response.status === 200) {
      const requestKey = generateRequestKey(response.config);
      requestCache.set(requestKey, {
        data: response.data,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5 minutes
      });
      pendingRequests.delete(requestKey);
    }

    return response;
  },
  async (error) => {
    const { config, response } = error;
    
    // Remove from pending requests
    if (config && config.method === 'get') {
      const requestKey = generateRequestKey(config);
      pendingRequests.delete(requestKey);
    }

    // Handle cancellation errors (don't reject these as they're expected)
    if (axios.isCancel(error) || error.name === 'CanceledError') {
      // Log cancellation in development only
      if (process.env.NODE_ENV === 'development') {
        console.log('Request cancelled:', error.message);
      }
      
      // For duplicate request cancellation, resolve with a special marker
      if (error.message === 'Duplicate request cancelled') {
        return Promise.resolve({ 
          data: null, 
          status: 'cancelled', 
          config,
          __isDuplicateCancellation: true 
        });
      }
      
      // For other cancellations, create a cancelled response
      return Promise.resolve({ 
        data: null, 
        status: 'cancelled', 
        config,
        __isCancelled: true 
      });
    }

    // Handle authentication errors
    if (response?.status === 401) {
      console.warn('Authentication failed:', response?.data?.message);
      
      // Clear tokens on 401 for protected routes
      if (config?.url?.includes('/admin/') || 
          config?.url?.includes('/customer/') || 
          config?.url?.includes('/delivery-agent/')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('customerToken');
        localStorage.removeItem('agentToken');
        localStorage.removeItem('deliveryAgentToken');
        
        // Optionally redirect to login
        if (window.location.pathname.includes('/admin/')) {
          window.location.href = '/admin';
        } else if (window.location.pathname.includes('/customer/')) {
          window.location.href = '/customer/login';
        } else if (window.location.pathname.includes('/delivery-agent/')) {
          window.location.href = '/delivery-agent/login';
        }
      }
    }

    // Retry logic for network errors
    if (!config?.__isRetryRequest && 
        (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED')) {
      config.__isRetryRequest = true;
      config.__retryCount = (config.__retryCount || 0) + 1;
      
      if (config.__retryCount <= 2) {
        const delay = Math.pow(2, config.__retryCount) * 1000; // Exponential backoff
        console.log(`Retrying request after ${delay}ms...`);
        
        return new Promise((resolve) => {
          setTimeout(() => resolve(apiClient(config)), delay);
        });
      }
    }

    return Promise.reject(error);
  }
);

// Enhanced error handler
const handleApiError = (error, customHandler) => {
  // Handle cancellation errors (these should be silent)
  if (axios.isCancel(error) || 
      error.name === 'CanceledError' || 
      error.name === 'AbortError' ||
      error.message === 'Duplicate request cancelled' ||
      error.message === 'canceled') {
    // Don't show toast or log for cancellation - it's expected behavior
    return { errorMessage: 'Request cancelled', errorCode: 'CANCELLED', isCancellation: true };
  }

  let errorMessage = 'An unexpected error occurred';
  let errorCode = 'UNKNOWN_ERROR';

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    errorMessage = data?.message || `HTTP Error ${status}`;
    errorCode = data?.code || `HTTP_${status}`;
  } else if (error.request) {
    // Network error
    errorMessage = 'Network error. Please check your connection.';
    errorCode = 'NETWORK_ERROR';
  } else {
    errorMessage = error.message || errorMessage;
  }

  // Use custom error handler if provided
  if (customHandler) {
    customHandler(errorMessage, errorCode);
  } else if (!error.config?.__suppressToast) {
    toast.error(errorMessage);
  }

  // Log error in development (but not cancellations)
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', {
      message: errorMessage,
      code: errorCode,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error
    });
  }

  return { errorMessage, errorCode };
};

// Cache utilities
const cacheUtils = {
  get: (key) => {
    const cached = requestCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
    requestCache.delete(key);
    return null;
  },
  
  clear: (pattern) => {
    if (pattern) {
      for (const [key] of requestCache) {
        if (key.includes(pattern)) {
          requestCache.delete(key);
        }
      }
    } else {
      requestCache.clear();
    }
  },
  
  size: () => requestCache.size
};

// Enhanced useApi hook with caching and optimization
export const useApi = (endpoint, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    immediate = true,
    transform = (data) => data,
    onSuccess,
    onError,
    cacheKey,
    enableCache = true
  } = options;

  const abortControllerRef = useRef(null);

  const execute = useCallback(async (params = {}, config = {}) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const requestKey = cacheKey || generateRequestKey({
        method: 'GET',
        url: endpoint,
        params
      });

      if (enableCache) {
        const cachedData = cacheUtils.get(requestKey);
        if (cachedData) {
          const transformedData = transform(cachedData);
          setData(transformedData);
          setLoading(false);
          if (onSuccess) onSuccess(transformedData);
          return transformedData;
        }
      }

      // Make API request
      const response = await apiClient.get(endpoint, {
        params,
        signal: abortControllerRef.current.signal,
        ...config
      });

      // Handle cancelled responses
      if (response.__isDuplicateCancellation || response.__isCancelled) {
        setLoading(false);
        return null; // Silently return null for cancelled requests
      }

      const transformedData = transform(response.data);
      setData(transformedData);
      
      if (onSuccess) {
        onSuccess(transformedData);
      }
      
      return transformedData;
    } catch (err) {
      // Handle abort/cancellation errors gracefully
      if (err.name === 'AbortError' || 
          axios.isCancel(err) || 
          err.name === 'CanceledError' ||
          err.message === 'canceled' ||
          err.message === 'Duplicate request cancelled') {
        setLoading(false);
        return null; // Silently return null for cancelled requests
      }

      const errorInfo = handleApiError(err, onError);
      
      // Only set error state and throw for non-cancellation errors
      if (!errorInfo?.isCancellation) {
        setError(errorInfo);
        throw err;
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, transform, onSuccess, onError, cacheKey, enableCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { data, loading, error, execute, refetch: execute };
};

// Optimized CRUD hook
export const useCrud = (resource) => {
  const [loading, setLoading] = useState(false);

  const create = useCallback(async (data) => {
    try {
      setLoading(true);
      const response = await apiClient.post(`/api/admin/${resource}`, data);
      
      // Handle cancelled responses
      if (response.__isDuplicateCancellation || response.__isCancelled) {
        setLoading(false);
        return null;
      }
      
      // Clear related cache
      cacheUtils.clear(resource);
      
      toast.success(response.data.message || 'Created successfully');
      return response.data;
    } catch (err) {
      // Handle cancellation errors gracefully
      if (err.name === 'AbortError' || 
          axios.isCancel(err) || 
          err.name === 'CanceledError' ||
          err.message === 'canceled' ||
          err.message === 'Duplicate request cancelled') {
        setLoading(false);
        return null;
      }

      const errorInfo = handleApiError(err);
      if (!errorInfo?.isCancellation) {
        throw err;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [resource]);

  const update = useCallback(async (id, data) => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/api/admin/${resource}/${id}`, data);
      
      // Handle cancelled responses
      if (response.__isDuplicateCancellation || response.__isCancelled) {
        setLoading(false);
        return null;
      }
      
      // Clear related cache
      cacheUtils.clear(resource);
      
      toast.success(response.data.message || 'Updated successfully');
      return response.data;
    } catch (err) {
      // Handle cancellation errors gracefully
      if (err.name === 'AbortError' || 
          axios.isCancel(err) || 
          err.name === 'CanceledError' ||
          err.message === 'canceled' ||
          err.message === 'Duplicate request cancelled') {
        setLoading(false);
        return null;
      }

      const errorInfo = handleApiError(err);
      if (!errorInfo?.isCancellation) {
        throw err;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [resource]);

  const remove = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await apiClient.delete(`/api/admin/${resource}/${id}`);
      
      // Handle cancelled responses
      if (response.__isDuplicateCancellation || response.__isCancelled) {
        setLoading(false);
        return null;
      }
      
      // Clear related cache
      cacheUtils.clear(resource);
      
      toast.success(response.data.message || 'Deleted successfully');
      return response.data;
    } catch (err) {
      // Handle cancellation errors gracefully
      if (err.name === 'AbortError' || 
          axios.isCancel(err) || 
          err.name === 'CanceledError' ||
          err.message === 'canceled' ||
          err.message === 'Duplicate request cancelled') {
        setLoading(false);
        return null;
      }

      const errorInfo = handleApiError(err);
      if (!errorInfo?.isCancellation) {
        throw err;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [resource]);

  const getById = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/admin/${resource}/${id}`);
      
      // Handle cancelled responses
      if (response.__isDuplicateCancellation || response.__isCancelled) {
        setLoading(false);
        return null;
      }
      
      return response.data;
    } catch (err) {
      // Handle cancellation errors gracefully
      if (err.name === 'AbortError' || 
          axios.isCancel(err) || 
          err.name === 'CanceledError' ||
          err.message === 'canceled' ||
          err.message === 'Duplicate request cancelled') {
        setLoading(false);
        return null;
      }

      const errorInfo = handleApiError(err);
      if (!errorInfo?.isCancellation) {
        throw err;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [resource]);

  return { create, update, remove, getById, loading };
};

// Enhanced paginated data hook
export const usePaginatedData = (endpoint, initialFilters = {}, options = {}) => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialFilters
  });

  const { onError, debounceMs = 500 } = options;
  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);

  const fetchData = useCallback(async () => {
    // Cancel previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(endpoint, {
        params: filters,
        signal: abortControllerRef.current.signal
      });

      // Handle cancelled responses
      if (response.__isDuplicateCancellation || response.__isCancelled) {
        setLoading(false);
        return; // Silently return for cancelled requests
      }

      if (response.data.success) {
        setData(response.data.data || []);
        setStats(response.data.stats || {});
        setPagination(response.data.stats?.pagination || {});
      }
    } catch (err) {
      // Handle abort/cancellation errors gracefully
      if (err.name === 'AbortError' || 
          axios.isCancel(err) || 
          err.name === 'CanceledError' ||
          err.message === 'canceled' ||
          err.message === 'Duplicate request cancelled') {
        setLoading(false);
        return; // Silently return for cancelled requests
      }

      const errorInfo = handleApiError(err, onError);
      
      // Only set error state for non-cancellation errors
      if (!errorInfo?.isCancellation) {
        setError(errorInfo);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, filters, onError]);

  // Debounced fetch for search
  const debouncedFetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(fetchData, debounceMs);
  }, [fetchData, debounceMs]);

  // Update filters with debouncing for search
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Reset to page 1 when filtering/searching
      if (newFilters.search !== undefined || Object.keys(newFilters).some(key => key !== 'page')) {
        updated.page = 1;
      }
      
      return updated;
    });
  }, []);

  useEffect(() => {
    debouncedFetch();
  }, [debouncedFetch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    stats,
    pagination,
    loading,
    error,
    filters,
    updateFilters,
    refetch: fetchData
  };
};

// Utility exports
export { apiClient, handleApiError, cacheUtils };

// Legacy exports for backward compatibility
export const useAuth = () => {
  // This should be imported from AuthContext instead
  console.warn('useAuth from useApi is deprecated. Import from AuthContext instead.');
  return {};
};

// Performance monitoring hook
export const useApiPerformance = () => {
  const [metrics, setMetrics] = useState({
    requestCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    cacheHitRate: 0
  });

  const updateMetrics = useCallback(() => {
    const cacheSize = cacheUtils.size();
    const pendingCount = pendingRequests.size;
    
    setMetrics(prev => ({
      ...prev,
      cacheSize,
      pendingRequests: pendingCount
    }));
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateMetrics]);

  return metrics;
};

// Hook for form handling with validation
export const useForm = (initialValues, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const setFieldTouched = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    
    Object.entries(validationRules).forEach(([field, rules]) => {
      const value = values[field];
      
      if (rules.required && (!value || value.toString().trim() === '')) {
        newErrors[field] = `${field} is required`;
      } else if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[field] = `${field} must be at least ${rules.minLength} characters`;
      } else if (rules.maxLength && value && value.length > rules.maxLength) {
        newErrors[field] = `${field} must be less than ${rules.maxLength} characters`;
      } else if (rules.pattern && value && !rules.pattern.test(value)) {
        newErrors[field] = rules.message || `${field} format is invalid`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const handleSubmit = useCallback((onSubmit) => {
    return (e) => {
      e.preventDefault();
      if (validate()) {
        onSubmit(values);
      }
    };
  }, [values, validate]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validate,
    reset,
    handleSubmit,
    isValid: Object.keys(errors).length === 0
  };
};

// Hook for local storage with state synchronization
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

// Hook for debounced values (useful for search)
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}; 