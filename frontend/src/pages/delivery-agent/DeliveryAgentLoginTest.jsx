import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { PasswordInput } from '../../components/ui';

const DeliveryAgentLoginTest = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    agentId: 'agent.demo@cms.com',
    password: 'agent123'
  });
  const [debugInfo, setDebugInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const addDebugInfo = (info) => {
    setDebugInfo(prev => prev + '\n' + info);
    console.log(info);
  };

  const testLogin = async () => {
    addDebugInfo('Starting login test...');
    
    try {
      const response = await axios.post('http://localhost:5000/api/delivery-agent/login', formData);
      
      addDebugInfo('Login API Response: ' + JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        addDebugInfo('Login successful, storing data...');
        
        // Store token and agent info
        sessionStorage.setItem('agentToken', response.data.token);
        const userData = {
          ...response.data.agent,
          userType: 'delivery_agent'
        };
        localStorage.setItem('user', JSON.stringify(userData));
        
        addDebugInfo('Stored token: ' + response.data.token.substring(0, 20) + '...');
        addDebugInfo('Stored user data: ' + JSON.stringify(userData, null, 2));
        
        // Set axios authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        addDebugInfo('Set axios authorization header');
        
        toast.success('Login successful!');
        
        // Test if we can access dashboard data
        addDebugInfo('Testing dashboard API...');
        const dashboardResponse = await axios.get('http://localhost:5000/api/delivery-agent/dashboard');
        addDebugInfo('Dashboard API Response: ' + JSON.stringify(dashboardResponse.data, null, 2));
        
        addDebugInfo('Attempting navigation to dashboard...');
        setTimeout(() => {
          navigate('/delivery-agent/dashboard');
        }, 1000);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      addDebugInfo('Login error: ' + message);
      addDebugInfo('Full error: ' + JSON.stringify(error.response?.data || error.message, null, 2));
      toast.error(message);
    }
  };

  const checkStoredData = () => {
    const token = sessionStorage.getItem('agentToken') || sessionStorage.getItem('deliveryAgentToken');
    const user = sessionStorage.getItem('user') || sessionStorage.getItem('deliveryAgentInfo');
    
    addDebugInfo('=== STORED DATA CHECK ===');
    addDebugInfo('agentToken: ' + (sessionStorage.getItem('agentToken') ? 'EXISTS' : 'NOT FOUND'));
    addDebugInfo('deliveryAgentToken: ' + (sessionStorage.getItem('deliveryAgentToken') ? 'EXISTS' : 'NOT FOUND'));
    addDebugInfo('user: ' + (sessionStorage.getItem('user') ? 'EXISTS' : 'NOT FOUND'));
    addDebugInfo('deliveryAgentInfo: ' + (sessionStorage.getItem('deliveryAgentInfo') ? 'EXISTS' : 'NOT FOUND'));
    addDebugInfo('Final token: ' + (token ? token.substring(0, 20) + '...' : 'NONE'));
    addDebugInfo('Final user: ' + (user || 'NONE'));
  };

  const clearStorage = () => {
    sessionStorage.removeItem('agentToken');
    sessionStorage.removeItem('deliveryAgentToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('deliveryAgentInfo');
    // Also clear legacy localStorage
    localStorage.removeItem('agentToken');
    localStorage.removeItem('deliveryAgentToken');
    localStorage.removeItem('user');
    localStorage.removeItem('deliveryAgentInfo');
    addDebugInfo('Cleared all storage');
    setDebugInfo('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate login process
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (formData.agentId === 'agent001' && formData.password === 'password') {
        toast.success('Login successful!');
        navigate('/delivery-agent/dashboard');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Delivery Agent Login Test
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Agent ID
              </label>
              <input
                type="text"
                name="agentId"
                value={formData.agentId}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter agent ID"
              />
            </div>
            
            <div>
              <PasswordInput
                label="Password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
                autoComplete="current-password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryAgentLoginTest; 