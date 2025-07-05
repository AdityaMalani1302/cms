import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    // Redirect to appropriate login page based on path
    const redirectPath = location.pathname.startsWith('/delivery-agent') 
      ? '/delivery-agent/login' 
      : location.pathname.startsWith('/customer')
      ? '/customer/login'
      : '/admin';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.userType)) {
    // Redirect to appropriate login page based on user type or path
    const redirectPath = user.userType === 'deliveryAgent' 
      ? '/delivery-agent/login'
      : user.userType === 'customer'
      ? '/customer/login'
      : location.pathname.startsWith('/delivery-agent')
      ? '/delivery-agent/login'
      : location.pathname.startsWith('/customer')
      ? '/customer/login'
      : '/admin';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // User is authenticated and has required role
  return children;
};

export default ProtectedRoute; 