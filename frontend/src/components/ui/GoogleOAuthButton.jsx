import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const GoogleOAuthButton = ({ mode = 'login' }) => {
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/auth/google/verify`, {
        credential: credentialResponse.credential
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        // Store token and user data
        sessionStorage.setItem('customerToken', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
        
        if (mode === 'register') {
          toast.success('Registration successful with Google!');
        } else {
          toast.success('Login successful!');
        }
        
        // Check if user needs to complete profile (missing phone or address)
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
      }
    } catch (error) {
      console.error('Google OAuth error:', error);
      const message = error.response?.data?.message || 'Google authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google authentication failed. Please try again.');
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md bg-gray-50">
          <svg className="animate-spin h-5 w-5 text-gray-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">Processing...</span>
        </div>
      ) : (
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          width="100%"
          theme="outline"
          size="large"
          text={mode === 'register' ? 'signup_with' : 'signin_with'}
          shape="rectangular"
          logo_alignment="left"
        />
      )}
    </div>
  );
};

export default GoogleOAuthButton; 