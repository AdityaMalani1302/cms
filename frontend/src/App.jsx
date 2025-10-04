import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// CSS imports
import 'react-toastify/dist/ReactToastify.css';

// Layout components (not lazy loaded as they're needed immediately)
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';


// Loading component for Suspense fallback
const LoadingFallback = ({ message = "Loading..." }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Optimized lazy loading with route-based code splitting
// Public pages chunk
const PublicPages = {
  Home: React.lazy(() => import('./pages/Home')),
  AboutUs: React.lazy(() => import('./pages/AboutUs')),
  TrackComplaint: React.lazy(() => import('./pages/TrackComplaint')),
  RaiseComplaint: React.lazy(() => import('./pages/RaiseComplaint')),
  Branches: React.lazy(() => import('./pages/Branches'))
};

// Authentication chunk
const AuthPages = {
  AdminLogin: React.lazy(() => import('./pages/admin/AdminLogin')),
  ForgotPassword: React.lazy(() => import('./pages/auth/ForgotPassword')),
  AdminRecovery: React.lazy(() => import('./pages/auth/AdminRecovery')),
  CustomerLogin: React.lazy(() => import('./pages/customer/Login')),
  CustomerRegister: React.lazy(() => import('./pages/customer/Register')),
  DeliveryAgentLogin: React.lazy(() => import('./pages/delivery-agent/DeliveryAgentLogin'))
};

// Admin pages chunk - loaded together for admin workflow
const AdminPages = {
  Dashboard: React.lazy(() => import('./pages/admin/AdminDashboard')),
  Profile: React.lazy(() => import('./pages/admin/AdminProfile')),
  DeliveryAgentManagement: React.lazy(() => import('./pages/admin/DeliveryAgentManagement')),
  ManageCouriers: React.lazy(() => import('./pages/admin/ManageCouriers')),
  ManageComplaints: React.lazy(() => import('./pages/admin/ManageComplaints')),
  ManageQueries: React.lazy(() => import('./pages/admin/ManageQueries')),
  ManageBranches: React.lazy(() => import('./pages/admin/ManageBranches')),
  UserManagement: React.lazy(() => import('./pages/admin/UserManagement')),
  AnalyticsReporting: React.lazy(() => import('./pages/admin/AnalyticsReporting')),
  AllocateCouriers: React.lazy(() => import('./pages/admin/AllocateCouriers'))
};

// Customer pages chunk - loaded together for customer workflow
const CustomerPages = {
  Dashboard: React.lazy(() => import('./pages/customer/Dashboard')),
  BookCourier: React.lazy(() => import('./pages/customer/BookCourier')),
  BookingHistory: React.lazy(() => import('./pages/customer/BookingHistory')),
  TrackParcel: React.lazy(() => import('./pages/customer/TrackParcel')),
  TrackComplaint: React.lazy(() => import('./pages/customer/TrackComplaint')),
  RaiseComplaint: React.lazy(() => import('./pages/customer/RaiseComplaint')),
  Support: React.lazy(() => import('./pages/customer/Support')),
  Notifications: React.lazy(() => import('./pages/customer/Notifications')),
  Profile: React.lazy(() => import('./pages/customer/Profile'))
};

// Delivery Agent pages chunk - loaded together for agent workflow
const DeliveryAgentPages = {
  Dashboard: React.lazy(() => import('./pages/delivery-agent/DeliveryAgentDashboard')),
  AssignedDeliveries: React.lazy(() => import('./pages/delivery-agent/AssignedDeliveries')),
  Profile: React.lazy(() => import('./pages/delivery-agent/AgentProfile'))
};

// Route wrapper with enhanced error handling and loading states
const RouteWrapper = ({ children, loadingMessage }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback message={loadingMessage} />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

function App() {
  // App initialization
  return (
    <ErrorBoundary>
        <AuthProvider>
        <Router 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800 flex flex-col transition-colors duration-300">
            <Header />
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={
                  <RouteWrapper loadingMessage="Loading home page...">
                    <PublicPages.Home />
                  </RouteWrapper>
                } />
                <Route path="/about-us" element={
                  <RouteWrapper loadingMessage="Loading about us...">
                    <PublicPages.AboutUs />
                  </RouteWrapper>
                } />
                <Route path="/track-parcel" element={
                  <RouteWrapper loadingMessage="Loading parcel tracking...">
                    <CustomerPages.TrackParcel />
                  </RouteWrapper>
                } />
                <Route path="/track-complaint" element={
                  <RouteWrapper loadingMessage="Loading complaint tracking...">
                    <PublicPages.TrackComplaint />
                  </RouteWrapper>
                } />
                <Route path="/raise-complaint" element={
                  <RouteWrapper loadingMessage="Loading complaint form...">
                    <PublicPages.RaiseComplaint />
                  </RouteWrapper>
                } />
                <Route path="/branches" element={
                  <RouteWrapper loadingMessage="Loading branches...">
                    <PublicPages.Branches />
                  </RouteWrapper>
                } />
                
                {/* Authentication Routes */}
                <Route path="/admin" element={
                  <RouteWrapper loadingMessage="Loading admin login...">
                    <AuthPages.AdminLogin />
                  </RouteWrapper>
                } />
                
                {/* Customer Authentication Routes */}
                <Route path="/customer/login" element={
                  <RouteWrapper loadingMessage="Loading customer login...">
                    <AuthPages.CustomerLogin />
                  </RouteWrapper>
                } />
                <Route path="/customer/register" element={
                  <RouteWrapper loadingMessage="Loading registration...">
                    <AuthPages.CustomerRegister />
                  </RouteWrapper>
                } />
                
                {/* Password Recovery Routes */}
                <Route path="/forgot-password" element={
                  <RouteWrapper loadingMessage="Loading password recovery...">
                    <AuthPages.ForgotPassword />
                  </RouteWrapper>
                } />
                <Route path="/admin/recovery" element={
                  <RouteWrapper loadingMessage="Loading admin recovery...">
                    <AuthPages.AdminRecovery />
                  </RouteWrapper>
                } />
                
                {/* Admin Dashboard Routes */}
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading admin dashboard...">
                      <AdminPages.Dashboard />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/profile" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading admin profile...">
                      <AdminPages.Profile />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                
                {/* Customer Dashboard Routes */}
                <Route path="/customer/dashboard" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading customer dashboard...">
                      <CustomerPages.Dashboard />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/book-courier" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading booking form...">
                      <CustomerPages.BookCourier />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/booking-history" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading booking history...">
                      <CustomerPages.BookingHistory />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/track-parcel" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading parcel tracking...">
                      <CustomerPages.TrackParcel />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/track-complaint" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading complaint tracking...">
                      <CustomerPages.TrackComplaint />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/raise-complaint" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading complaint form...">
                      <CustomerPages.RaiseComplaint />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/support" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading support...">
                      <CustomerPages.Support />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/notifications" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading notifications...">
                      <CustomerPages.Notifications />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/profile" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading profile...">
                      <CustomerPages.Profile />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                
                {/* Delivery Agent Routes */}
                <Route path="/delivery-agent/login" element={
                  <RouteWrapper loadingMessage="Loading delivery agent login...">
                    <AuthPages.DeliveryAgentLogin />
                  </RouteWrapper>
                } />
                <Route path="/delivery-agent/dashboard" element={
                  <ProtectedRoute allowedRoles={['delivery_agent']}>
                    <RouteWrapper loadingMessage="Loading delivery agent dashboard...">
                      <DeliveryAgentPages.Dashboard />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/delivery-agent/assignments" element={
                  <ProtectedRoute allowedRoles={['delivery_agent']}>
                    <RouteWrapper loadingMessage="Loading assigned deliveries...">
                      <DeliveryAgentPages.AssignedDeliveries />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/delivery-agent/profile" element={
                  <ProtectedRoute allowedRoles={['delivery_agent']}>
                    <RouteWrapper loadingMessage="Loading agent profile...">
                      <DeliveryAgentPages.Profile />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />

                {/* Admin management routes */}
                <Route path="/admin/delivery-agents" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading delivery agent management...">
                      <AdminPages.DeliveryAgentManagement />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/couriers" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading courier management...">
                      <AdminPages.ManageCouriers />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading user management...">
                      <AdminPages.UserManagement />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/complaints" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading complaint management...">
                      <AdminPages.ManageComplaints />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/queries" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading query management...">
                      <AdminPages.ManageQueries />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/branches" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading branch management...">
                      <AdminPages.ManageBranches />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/analytics" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading analytics...">
                      <AdminPages.AnalyticsReporting />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/reports" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading reports...">
                      <AdminPages.AnalyticsReporting />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/allocate-couriers" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading allocate couriers...">
                      <AdminPages.AllocateCouriers />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />

                {/* 404 Route */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                      <p className="text-gray-600 mb-4">Page not found</p>
                      <a href="/" className="bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700">
                        Go Home
                      </a>
                    </div>
                  </div>
                } />
              </Routes>
            </main>
            <Footer />
            
            {/* Enhanced Toast Configuration with Deduplication */}
            <ToastContainer
              position="top-right"
              autoClose={4000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              limit={2} // Reduced limit to prevent clutter
              toastClassName="text-sm"
              enableMultiContainer={false} // Prevent multiple containers
              containerId="main-toast-container"
            />
          </div>
        </Router>
        </AuthProvider>
    </ErrorBoundary>
  );
}

export default App; 