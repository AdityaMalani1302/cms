import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { migrateAuthTokens } from '../utils/authMigration';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const logout = useCallback((navigate, showToast = true) => {
    // Store user type before clearing user state
    const userType = user?.userType;
    
    // Clear all possible token types from sessionStorage
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminRefreshToken');
    sessionStorage.removeItem('customerToken');
    sessionStorage.removeItem('customerRefreshToken');
    sessionStorage.removeItem('agentToken');
    sessionStorage.removeItem('agentRefreshToken');
    sessionStorage.removeItem('deliveryAgentToken');
    sessionStorage.removeItem('deliveryAgentRefreshToken');
    sessionStorage.removeItem('deliveryAgentInfo');
    sessionStorage.removeItem('user');
    
    // Also clear any legacy localStorage tokens for clean migration
    localStorage.removeItem('adminToken');
    localStorage.removeItem('customerToken');
    localStorage.removeItem('agentToken');
    localStorage.removeItem('deliveryAgentToken');
    localStorage.removeItem('deliveryAgentInfo');
    localStorage.removeItem('user');
    
    delete axios.defaults.headers.common['Authorization'];
    if (mountedRef.current) {
      setUser(null);
    }
    
    // Show success message only if explicitly requested
    if (showToast) {
      toast.success('Logged out successfully!');
    }
    
    // Navigate to appropriate login page if navigate function is provided
    if (navigate) {
      if (userType === 'admin') {
        navigate('/admin');
      } else if (userType === 'delivery_agent') {
        navigate('/delivery-agent/login');
      } else if (userType === 'customer') {
        navigate('/customer/login');
      } else if (userType === 'staff') {
        navigate('/staff');
      } else {
        navigate('/');
      }
    }
  }, [user]);

  const refreshAuth = useCallback(async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const refreshToken = sessionStorage.getItem('customerRefreshToken') || 
                         sessionStorage.getItem('adminRefreshToken') || 
                         sessionStorage.getItem('agentRefreshToken') ||
                         sessionStorage.getItem('deliveryAgentRefreshToken');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${baseURL}/api/auth/refresh`, {
        refreshToken
      });

      if (response.data.success) {
        const { accessToken, user: userData } = response.data;
        
        // Update the appropriate token based on user type
        if (userData && userData.userType === 'admin') {
          sessionStorage.setItem('adminToken', accessToken);
        } else if (userData && userData.userType === 'customer') {
          sessionStorage.setItem('customerToken', accessToken);
        } else if (userData && userData.userType === 'staff') {
          sessionStorage.setItem('agentToken', accessToken);
        } else if (userData && userData.userType === 'delivery_agent') {
          sessionStorage.setItem('agentToken', accessToken);
        }

        // Update user data and axios headers
        if (userData) {
          sessionStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Silent logout without showing toast to prevent loops
      logout(null, false);
      return false;
    }
  }, [logout]);

  useEffect(() => {
    console.log('🔄 AuthContext initializing...');
    
    // Migrate any existing localStorage tokens to sessionStorage for security
    migrateAuthTokens();
    
    // Check for any valid token
    const adminToken = sessionStorage.getItem('adminToken');
    const customerToken = sessionStorage.getItem('customerToken');
    const agentToken = sessionStorage.getItem('agentToken');
    const deliveryAgentToken = sessionStorage.getItem('deliveryAgentToken'); // Support legacy token name
    const token = adminToken || customerToken || agentToken || deliveryAgentToken;
    
    console.log('🔍 AuthContext token check:', {
      adminToken: !!adminToken,
      customerToken: !!customerToken,
      agentToken: !!agentToken,
      deliveryAgentToken: !!deliveryAgentToken,
      finalToken: !!token
    });
    
    if (token) {
      // SECURITY FIX: Validate token expiration before using it
      const isTokenExpired = (token) => {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return Date.now() >= payload.exp * 1000;
        } catch {
          return true;
        }
      };
      
      if (isTokenExpired(token)) {
        // Try to refresh the token if it's expired
        const refreshToken = sessionStorage.getItem('customerRefreshToken') || 
                           sessionStorage.getItem('adminRefreshToken') || 
                           sessionStorage.getItem('agentRefreshToken') ||
                           sessionStorage.getItem('deliveryAgentRefreshToken');
        
        if (refreshToken) {
          refreshAuth();
          return;
        }
        // If no refresh token, then logout (call directly without dependency)
        sessionStorage.clear();
        localStorage.clear();
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setLoading(false);
        return;
      }
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const userData = sessionStorage.getItem('user');
      const deliveryAgentInfo = sessionStorage.getItem('deliveryAgentInfo'); // Support legacy user info
      
      console.log('📝 AuthContext user data check:', {
        userData: !!userData,
        deliveryAgentInfo: !!deliveryAgentInfo
      });
      
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('✅ AuthContext user set from userData:', parsedUser);
      } else if (deliveryAgentInfo) {
        // Handle legacy delivery agent info
        const agentData = JSON.parse(deliveryAgentInfo);
        const userWithType = {
          ...agentData,
          userType: 'delivery_agent'
        };
        setUser(userWithType);
        console.log('✅ AuthContext user set from deliveryAgentInfo:', userWithType);
      } else {
        console.log('❌ No user data found in sessionStorage');
      }
    }
    setLoading(false);
  }, []); // Remove dependencies to prevent infinite loop

  // Add axios response interceptor to handle 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Don't try to refresh during login attempts
          if (originalRequest.url.includes('/auth/login') || 
              originalRequest.url.includes('/auth/register')) {
            return Promise.reject(error);
          }

          originalRequest._retry = true;
          
          try {
            console.log('🔄 Attempting token refresh due to 401 error');
            const refreshSuccessful = await refreshAuth();
            if (refreshSuccessful) {
              console.log('✅ Token refresh successful, retrying original request');
              // Update the authorization header for the retry
              const newToken = sessionStorage.getItem('customerToken') || 
                              sessionStorage.getItem('adminToken') || 
                              sessionStorage.getItem('agentToken');
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              // Retry the original request with new token
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            // Clear tokens and user data on refresh failure (without showing toast)
            sessionStorage.clear();
            localStorage.clear();
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []); // Remove dependencies to prevent infinite loop

  const handleAuthSuccess = (userData, tokenData) => {
    const { accessToken, refreshToken, userType } = tokenData;
    
    // Map userType to correct token keys for consistency
    let tokenKey, refreshTokenKey;
    if (userType === 'delivery_agent') {
      tokenKey = 'agentToken';
      refreshTokenKey = 'agentRefreshToken';
    } else {
      tokenKey = `${userType}Token`;
      refreshTokenKey = `${userType}RefreshToken`;
    }

    // Store tokens
    sessionStorage.setItem(tokenKey, accessToken);
    if (refreshToken) {
      sessionStorage.setItem(refreshTokenKey, refreshToken);
    }

    // Store user data
    const userWithType = { ...userData, userType };
    sessionStorage.setItem('user', JSON.stringify(userWithType));
    
    // Set axios header
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    // Update state
    setUser(userWithType);
    console.log('🔑 AuthContext user state updated:', userWithType);

    return { success: true, user: userWithType };
  };

  const adminLogin = async (username, password) => {
    try {
      console.log('👉 Admin login attempt:', { username });
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/auth/admin/login`, {
        userName: username,
        password
      });
      
      if (response.data.success) {
        const { token, accessToken, refreshToken, user } = response.data;
        console.log('✅ Admin login successful');
        
        return handleAuthSuccess(user, {
          accessToken: accessToken || token,
          refreshToken,
          userType: 'admin'
        });
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const staffLogin = async (username, password) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/auth/staff/login`, {
        staffEmail: username,
        staffPassword: password
      });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        return handleAuthSuccess(user, {
          accessToken: token,
          userType: 'staff'
        });
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  // Customer registration
  const register = async (userData) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/auth/register`, userData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        sessionStorage.setItem('customerToken', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
        toast.success('Registration successful!');
        return { success: true, user };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return {
        success: false,
        message
      };
    }
  };

  const customerLogin = async (email, password) => {
    try {
      console.log('🔐 Customer login attempt:', { email });
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/auth/login`, {
        email,
        password
      });
      
      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;
        console.log('✅ Customer login successful');
        
        return handleAuthSuccess(user, {
          accessToken,
          refreshToken,
          userType: 'customer'
        });
      }
    } catch (error) {
      console.error('❌ Customer login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const login = async (credentials, userType) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const endpoint = userType === 'admin' ? '/api/auth/admin/login' : '/api/auth/staff/login';
      const response = await axios.post(`${baseURL}${endpoint}`, credentials);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        const tokenKey = userType === 'admin' ? 'adminToken' : 'agentToken';
        sessionStorage.setItem(tokenKey, token);
        sessionStorage.setItem('user', JSON.stringify(user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
        return { success: true, user };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return {
        success: false,
        message
      };
    }
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const isAdmin = () => {
    return user?.userType === 'admin';
  };

  const isStaff = () => {
    return user?.userType === 'staff';
  };

  const isCustomer = () => {
    return user?.userType === 'customer';
  };

  const isDeliveryAgent = () => {
    return user?.userType === 'delivery_agent';
  };

  const deliveryAgentLogin = async (email, password) => {
    try {
      console.log('🔐 Delivery agent login attempt:', { email });
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/delivery-agent/login`, {
        email,
        password
      });
      
      if (response.data.success) {
        const { accessToken, refreshToken, agent } = response.data;
        console.log('✅ Delivery agent login successful');
        
        return handleAuthSuccess(agent, {
          accessToken,
          refreshToken,
          userType: 'delivery_agent'
        });
      }
    } catch (error) {
      console.error('❌ Delivery agent login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  // Function to manually restore user state from sessionStorage
  const restoreUserState = () => {
    const userData = sessionStorage.getItem('user');
    const deliveryAgentInfo = sessionStorage.getItem('deliveryAgentInfo');
    
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      console.log('🔄 Manually restored user state:', parsedUser);
      return parsedUser;
    } else if (deliveryAgentInfo) {
      const agentData = JSON.parse(deliveryAgentInfo);
      const userWithType = {
        ...agentData,
        userType: 'delivery_agent'
      };
      setUser(userWithType);
      console.log('🔄 Manually restored agent state:', userWithType);
      return userWithType;
    }
    return null;
  };

  const value = {
    user,
    loading,
    logout,
    refreshAuth,
    handleAuthSuccess,
    adminLogin,
    staffLogin,
    register,
    customerLogin,
    login,
    isAuthenticated,
    isAdmin,
    isStaff,
    isCustomer,
    isDeliveryAgent,
    deliveryAgentLogin,
    restoreUserState,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 