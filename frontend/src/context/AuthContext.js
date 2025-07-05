import React, { createContext, useState, useContext, useEffect } from 'react';
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

  useEffect(() => {
    // Migrate any existing localStorage tokens to sessionStorage for security
    migrateAuthTokens();
    
    // Check for any valid token
    const adminToken = sessionStorage.getItem('adminToken');
    const customerToken = sessionStorage.getItem('customerToken');
    const agentToken = sessionStorage.getItem('agentToken');
    const deliveryAgentToken = sessionStorage.getItem('deliveryAgentToken'); // Support legacy token name
    const token = adminToken || customerToken || agentToken || deliveryAgentToken;
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // You could verify the token here
      const userData = sessionStorage.getItem('user');
      const deliveryAgentInfo = sessionStorage.getItem('deliveryAgentInfo'); // Support legacy user info
      
      if (userData) {
        setUser(JSON.parse(userData));
      } else if (deliveryAgentInfo) {
        // Handle legacy delivery agent info
        const agentData = JSON.parse(deliveryAgentInfo);
        setUser({
          ...agentData,
          userType: 'deliveryAgent'
        });
      }
    }
    setLoading(false);
  }, []);

  const adminLogin = async (username, password) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/auth/admin/login`, {
        userName: username,
        password
      });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        // Store admin token with correct key
        sessionStorage.setItem('adminToken', token);
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

  const staffLogin = async (username, password) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/auth/staff/login`, {
        staffEmail: username,
        staffPassword: password
      });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        sessionStorage.setItem('agentToken', token);
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

  // Customer login
  const customerLogin = async (email, password) => {
    try {
      console.log('🔐 Customer login attempt:', { email });
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/auth/login`, {
        email,
        password
      });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        sessionStorage.setItem('customerToken', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
        toast.success('Login successful!');
        console.log('✅ Customer login successful');
        return { success: true, user };
      }
    } catch (error) {
      console.error('❌ Customer login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return {
        success: false,
        message
      };
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

  const logout = (navigate) => {
    // Store user type before clearing user state
    const userType = user?.userType;
    
    // Clear all possible token types from sessionStorage
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('customerToken');
    sessionStorage.removeItem('agentToken');
    sessionStorage.removeItem('deliveryAgentToken'); // Support legacy token name
    sessionStorage.removeItem('deliveryAgentInfo'); // Support legacy user info
    sessionStorage.removeItem('user');
    
    // Also clear any legacy localStorage tokens for clean migration
    localStorage.removeItem('adminToken');
    localStorage.removeItem('customerToken');
    localStorage.removeItem('agentToken');
    localStorage.removeItem('deliveryAgentToken');
    localStorage.removeItem('deliveryAgentInfo');
    localStorage.removeItem('user');
    
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    
    // Show success message
    toast.success('Logged out successfully!');
    
    // Navigate to appropriate login page if navigate function is provided
    if (navigate) {
      if (userType === 'admin') {
        navigate('/admin');
      } else if (userType === 'deliveryAgent') {
        navigate('/delivery-agent/login');
      } else if (userType === 'customer') {
        navigate('/customer/login');
      } else if (userType === 'staff') {
        navigate('/staff');
      } else {
        navigate('/');
      }
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

  const refreshAuth = () => {
    // Force refresh authentication state from localStorage
    const adminToken = localStorage.getItem('adminToken');
    const customerToken = localStorage.getItem('customerToken');
    const agentToken = localStorage.getItem('agentToken');
    const deliveryAgentToken = localStorage.getItem('deliveryAgentToken');
    const token = adminToken || customerToken || agentToken || deliveryAgentToken;
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const userData = localStorage.getItem('user');
      const deliveryAgentInfo = localStorage.getItem('deliveryAgentInfo');
      
      if (userData) {
        setUser(JSON.parse(userData));
      } else if (deliveryAgentInfo) {
        const agentData = JSON.parse(deliveryAgentInfo);
        setUser({
          ...agentData,
          userType: 'deliveryAgent'
        });
      }
    } else {
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const value = {
    user,
    login,
    adminLogin,
    staffLogin,
    customerLogin,
    register,
    logout,
    isAuthenticated,
    isAdmin,
    isStaff,
    isCustomer,
    refreshAuth,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 