import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      const userString = urlParams.get('user');
      const error = urlParams.get('message');

      if (error) {
        toast.error(decodeURIComponent(error));
        navigate('/customer/login');
        return;
      }

      if (token && userString) {
        try {
          const user = JSON.parse(decodeURIComponent(userString));
          
          // Store token and user data
          sessionStorage.setItem('customerToken', token);
          sessionStorage.setItem('user', JSON.stringify(user));
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          setUser(user);
          toast.success('Login successful!');
          
          // Check if user needs to complete profile
          const needsProfileCompletion = !user.phoneNumber || 
            !user.address?.street || 
            !user.address?.city || 
            !user.address?.state || 
            !user.address?.pincode;
          
          if (needsProfileCompletion) {
            toast.info('Please complete your profile information.');
            navigate('/customer/profile?complete=true');
          } else {
            navigate('/customer/dashboard');
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          toast.error('Authentication failed. Please try again.');
          navigate('/customer/login');
        }
      } else {
        toast.error('Authentication failed. Please try again.');
        navigate('/customer/login');
      }
    };

    handleCallback();
  }, [location, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-primary-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};

export default GoogleCallback; 