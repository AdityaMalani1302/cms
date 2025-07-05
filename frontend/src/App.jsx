import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { GoogleOAuthProvider } from '@react-oauth/google';
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

// Lazy load components for better performance
// Public pages
const Home = React.lazy(() => import('./pages/Home'));
const AboutUs = React.lazy(() => import('./pages/AboutUs'));
const TrackParcel = React.lazy(() => import('./pages/TrackParcel'));
const TrackComplaint = React.lazy(() => import('./pages/TrackComplaint'));
const RaiseComplaint = React.lazy(() => import('./pages/RaiseComplaint'));
const Branches = React.lazy(() => import('./pages/Branches'));

// Authentication pages
const AdminLogin = React.lazy(() => import('./pages/admin/AdminLogin'));
const GoogleCallback = React.lazy(() => import('./pages/auth/GoogleCallback'));

// Admin pages - grouped for better code splitting
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProfile = React.lazy(() => import('./pages/admin/AdminProfile'));
const DeliveryAgentManagement = React.lazy(() => import('./pages/admin/DeliveryAgentManagement'));
const AssignmentWorkflow = React.lazy(() => import('./pages/admin/AssignmentWorkflow'));
const ManageCouriers = React.lazy(() => import('./pages/admin/ManageCouriers'));
const ManageComplaints = React.lazy(() => import('./pages/admin/ManageComplaints'));
const ManageBranches = React.lazy(() => import('./pages/admin/ManageBranches'));
const ManageAnalytics = React.lazy(() => import('./pages/admin/ManageAnalytics'));

// Customer pages - grouped for better code splitting
const CustomerLogin = React.lazy(() => import('./pages/customer/Login'));
const CustomerRegister = React.lazy(() => import('./pages/customer/Register'));
const CustomerDashboard = React.lazy(() => import('./pages/customer/Dashboard'));
const BookCourier = React.lazy(() => import('./pages/customer/BookCourier'));
const BookingHistory = React.lazy(() => import('./pages/customer/BookingHistory'));
const CustomerTrackParcel = React.lazy(() => import('./pages/customer/TrackParcel'));
const CustomerTrackComplaint = React.lazy(() => import('./pages/customer/TrackComplaint'));
const CustomerRaiseComplaint = React.lazy(() => import('./pages/customer/RaiseComplaint'));
const CustomerSupport = React.lazy(() => import('./pages/customer/Support'));
const CustomerNotifications = React.lazy(() => import('./pages/customer/Notifications'));
const CustomerProfile = React.lazy(() => import('./pages/customer/Profile'));

// Delivery Agent pages - grouped for better code splitting
const DeliveryAgentLogin = React.lazy(() => import('./pages/delivery-agent/DeliveryAgentLogin'));
const DeliveryAgentLoginTest = React.lazy(() => import('./pages/delivery-agent/DeliveryAgentLoginTest'));
const DeliveryAgentDashboard = React.lazy(() => import('./pages/delivery-agent/DeliveryAgentDashboard'));
const AssignedDeliveries = React.lazy(() => import('./pages/delivery-agent/AssignedDeliveries'));
const DeliveryConfirmation = React.lazy(() => import('./pages/delivery-agent/DeliveryConfirmation'));
const QRScanner = React.lazy(() => import('./pages/delivery-agent/QRScanner'));
const AgentProfile = React.lazy(() => import('./pages/delivery-agent/AgentProfile'));
const ReportIssue = React.lazy(() => import('./pages/delivery-agent/ReportIssue'));

// Route wrapper with enhanced error handling and loading states
const RouteWrapper = ({ children, loadingMessage }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback message={loadingMessage} />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
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
                    <Home />
                  </RouteWrapper>
                } />
                <Route path="/about-us" element={
                  <RouteWrapper loadingMessage="Loading about us...">
                    <AboutUs />
                  </RouteWrapper>
                } />
                <Route path="/track-parcel" element={
                  <RouteWrapper loadingMessage="Loading parcel tracking...">
                    <TrackParcel />
                  </RouteWrapper>
                } />
                <Route path="/track-complaint" element={
                  <RouteWrapper loadingMessage="Loading complaint tracking...">
                    <TrackComplaint />
                  </RouteWrapper>
                } />
                <Route path="/raise-complaint" element={
                  <RouteWrapper loadingMessage="Loading complaint form...">
                    <RaiseComplaint />
                  </RouteWrapper>
                } />
                <Route path="/branches" element={
                  <RouteWrapper loadingMessage="Loading branches...">
                    <Branches />
                  </RouteWrapper>
                } />
                
                {/* Authentication Routes */}
                <Route path="/admin" element={
                  <RouteWrapper loadingMessage="Loading admin login...">
                    <AdminLogin />
                  </RouteWrapper>
                } />
                
                {/* Customer Authentication Routes */}
                <Route path="/customer/login" element={
                  <RouteWrapper loadingMessage="Loading customer login...">
                    <CustomerLogin />
                  </RouteWrapper>
                } />
                <Route path="/customer/register" element={
                  <RouteWrapper loadingMessage="Loading registration...">
                    <CustomerRegister />
                  </RouteWrapper>
                } />
                
                {/* Google OAuth Callback Routes */}
                <Route path="/auth/google/success" element={
                  <RouteWrapper loadingMessage="Processing authentication...">
                    <GoogleCallback />
                  </RouteWrapper>
                } />
                <Route path="/auth/google/error" element={
                  <RouteWrapper loadingMessage="Processing authentication...">
                    <GoogleCallback />
                  </RouteWrapper>
                } />
                
                {/* Admin Dashboard Routes */}
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading admin dashboard...">
                      <AdminDashboard />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/profile" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading admin profile...">
                      <AdminProfile />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                
                {/* Customer Dashboard Routes */}
                <Route path="/customer/dashboard" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading customer dashboard...">
                      <CustomerDashboard />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/book-courier" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading booking form...">
                      <BookCourier />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/booking-history" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading booking history...">
                      <BookingHistory />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/track-parcel" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading parcel tracking...">
                      <CustomerTrackParcel />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/track-complaint" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading complaint tracking...">
                      <CustomerTrackComplaint />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/raise-complaint" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading complaint form...">
                      <CustomerRaiseComplaint />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/support" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading support...">
                      <CustomerSupport />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/notifications" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading notifications...">
                      <CustomerNotifications />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/customer/profile" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <RouteWrapper loadingMessage="Loading profile...">
                      <CustomerProfile />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                
                {/* Delivery Agent Routes */}
                <Route path="/delivery-agent/login" element={
                  <RouteWrapper loadingMessage="Loading agent login...">
                    <DeliveryAgentLogin />
                  </RouteWrapper>
                } />
                <Route path="/delivery-agent/login-test" element={
                  <RouteWrapper loadingMessage="Loading test login...">
                    <DeliveryAgentLoginTest />
                  </RouteWrapper>
                } />
                <Route path="/delivery-agent/dashboard" element={
                  <ProtectedRoute allowedRoles={['deliveryAgent']}>
                    <RouteWrapper loadingMessage="Loading agent dashboard...">
                      <DeliveryAgentDashboard />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/delivery-agent/assignments" element={
                  <ProtectedRoute allowedRoles={['deliveryAgent']}>
                    <RouteWrapper loadingMessage="Loading assignments...">
                      <AssignedDeliveries />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/delivery-agent/deliver/:deliveryId" element={
                  <ProtectedRoute allowedRoles={['deliveryAgent']}>
                    <RouteWrapper loadingMessage="Loading delivery confirmation...">
                      <DeliveryConfirmation />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/delivery-agent/scan" element={
                  <ProtectedRoute allowedRoles={['deliveryAgent']}>
                    <RouteWrapper loadingMessage="Loading QR scanner...">
                      <QRScanner />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/delivery-agent/profile" element={
                  <ProtectedRoute allowedRoles={['deliveryAgent']}>
                    <RouteWrapper loadingMessage="Loading agent profile...">
                      <AgentProfile />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/delivery-agent/report-issue" element={
                  <ProtectedRoute allowedRoles={['deliveryAgent']}>
                    <RouteWrapper loadingMessage="Loading issue reporter...">
                      <ReportIssue />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/delivery-agent/report-issue/:deliveryId" element={
                  <ProtectedRoute allowedRoles={['deliveryAgent']}>
                    <RouteWrapper loadingMessage="Loading issue reporter...">
                      <ReportIssue />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />

                {/* Admin management routes */}
                <Route path="/admin/delivery-agents" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading delivery agent management...">
                      <DeliveryAgentManagement />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/assignments" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading assignment workflow...">
                      <AssignmentWorkflow />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/couriers" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading courier management...">
                      <ManageCouriers />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/complaints" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading complaint management...">
                      <ManageComplaints />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/branches" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading branch management...">
                      <ManageBranches />
                    </RouteWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/admin/analytics" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RouteWrapper loadingMessage="Loading analytics...">
                      <ManageAnalytics />
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
            
            {/* Enhanced Toast Configuration */}
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              limit={3} // Limit number of toasts
              toastClassName="text-sm"
            />
          </div>
        </Router>
      </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}

export default App; 