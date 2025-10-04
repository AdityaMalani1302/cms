import axios from 'axios';

// Request deduplication utility
class RequestManager {
  constructor() {
    this.pendingRequests = new Map();
    this.requestTimeouts = new Map();
    this.dedupTimeout = 500; // 500ms deduplication window
  }

  // Generate request key for deduplication
  getRequestKey(config) {
    const { method, url, data, params } = config;
    const key = `${method}:${url}:${JSON.stringify(data || {})}:${JSON.stringify(params || {})}`;
    return key.toLowerCase().replace(/\s+/g, '');
  }

  // Check if request is duplicate
  isDuplicateRequest(config) {
    const key = this.getRequestKey(config);
    return this.pendingRequests.has(key);
  }

  // Add request to pending list
  addPendingRequest(config) {
    const key = this.getRequestKey(config);
    const controller = new AbortController();
    
    this.pendingRequests.set(key, controller);
    
    // Auto-cleanup after timeout
    const timeoutId = setTimeout(() => {
      this.removePendingRequest(key);
    }, this.dedupTimeout);
    
    this.requestTimeouts.set(key, timeoutId);
    
    return controller;
  }

  // Remove request from pending list
  removePendingRequest(key) {
    this.pendingRequests.delete(key);
    
    const timeoutId = this.requestTimeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.requestTimeouts.delete(key);
    }
  }

  // Create axios instance with deduplication
  createAxiosInstance() {
    const instance = axios.create();

    // Request interceptor for deduplication
    instance.interceptors.request.use((config) => {
      // Skip deduplication for GET requests or if explicitly disabled
      if (config.method === 'get' || config.__skipDedup) {
        return config;
      }

      const key = this.getRequestKey(config);
      
      // Check for duplicate request
      if (this.isDuplicateRequest(config)) {
        const error = new Error('Duplicate request blocked');
        error.name = 'DuplicateRequestError';
        error.config = config;
        return Promise.reject(error);
      }

      // Add to pending requests
      const controller = this.addPendingRequest(config);
      config.signal = controller.signal;
      config.__requestKey = key;

      return config;
    });

    // Response interceptor for cleanup
    instance.interceptors.response.use(
      (response) => {
        // Cleanup pending request
        if (response.config.__requestKey) {
          this.removePendingRequest(response.config.__requestKey);
        }
        return response;
      },
      (error) => {
        // Cleanup pending request
        if (error.config?.__requestKey) {
          this.removePendingRequest(error.config.__requestKey);
        }

        // Handle duplicate request errors silently
        if (error.name === 'DuplicateRequestError') {
          console.log('Duplicate request blocked:', error.config.url);
          return Promise.reject(new Error('Request already in progress'));
        }

        return Promise.reject(error);
      }
    );

    return instance;
  }

  // Clear all pending requests
  clearAll() {
    // Cancel all pending requests
    for (const controller of this.pendingRequests.values()) {
      controller.abort();
    }
    
    // Clear timeouts
    for (const timeoutId of this.requestTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    
    this.pendingRequests.clear();
    this.requestTimeouts.clear();
  }
}

// Create singleton instance
const requestManager = new RequestManager();

// Export deduplicating axios instance
export const apiClient = requestManager.createAxiosInstance();

// Export utilities
export const requestUtils = {
  clearPendingRequests: () => requestManager.clearAll(),
  getPendingCount: () => requestManager.pendingRequests.size
};

// Default export
export default apiClient;