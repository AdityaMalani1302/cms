import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldUseDark);
    if (shouldUseDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleLogout = () => {
    logout(navigate);
    setIsMobileMenuOpen(false);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { to: '/', label: 'Home', icon: 'fas fa-home', public: true },
    { to: '/about-us', label: 'About Us', icon: 'fas fa-info-circle', public: true },
    { to: '/branches', label: 'Branches', icon: 'fas fa-map-marker-alt', public: true }
  ];

  // Additional items for authenticated customers
  const customerNavItems = [];

  // Get navigation items based on authentication status
  const getNavItems = () => {
    const baseItems = navItems;
    if (isAuthenticated() && user?.userType === 'customer') {
      return [...baseItems, ...customerNavItems];
    }
    return baseItems;
  };

  const isActiveRoute = (path) => location.pathname === path;

  const mobileMenuVariants = {
    closed: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    open: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const mobileItemVariants = {
    closed: { opacity: 0, x: -20 },
    open: { opacity: 1, x: 0 }
  };

  return (
    <header className="bg-white/95 dark:bg-secondary-900/95 backdrop-blur-md border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-40 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.div 
              className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-shipping-fast text-white text-lg"></i>
            </motion.div>
            <div className="hidden sm:block">
              <div className="text-xl font-bold text-gradient dark:text-white">CMS</div>
              <div className="text-xs text-secondary-600 dark:text-secondary-400 -mt-1">Courier Management</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {getNavItems().map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200',
                  isActiveRoute(item.to)
                    ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30'
                    : 'text-secondary-700 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-secondary-800'
                )}
              >
                <i className={`${item.icon} text-sm`}></i>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Dark Mode Toggle */}
            <motion.button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                <motion.i
                  key={isDarkMode ? 'sun' : 'moon'}
                  className={isDarkMode ? 'fas fa-sun text-lg' : 'fas fa-moon text-lg'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </AnimatePresence>
            </motion.button>

            {/* Authentication Section - Desktop */}
            <div className="hidden md:flex items-center space-x-3">
              {!isAuthenticated() ? (
                <>
                  {/* Customer Authentication - Primary */}
                  <Link
                    to="/customer/login"
                    className="px-4 py-2 rounded-lg text-secondary-700 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-secondary-800 transition-all duration-200 font-medium flex items-center space-x-2"
                  >
                    <i className="fas fa-sign-in-alt text-sm"></i>
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/customer/register"
                    className="btn-primary flex items-center space-x-2 mr-3"
                  >
                    <i className="fas fa-user-plus text-sm"></i>
                    <span>Register</span>
                  </Link>
                  
                  {/* Admin/Delivery Agent Section - Secondary */}
                  <div className="flex items-center space-x-2 pl-3 border-l border-secondary-200 dark:border-secondary-700">
                    <Link
                      to="/admin"
                      className="px-3 py-2 rounded-lg text-sm text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all duration-200 font-medium flex items-center space-x-1"
                    >
                      <i className="fas fa-user-shield text-xs"></i>
                      <span>Admin</span>
                    </Link>
                    <Link
                      to="/delivery-agent/login"
                      className="px-3 py-2 rounded-lg text-sm text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all duration-200 font-medium flex items-center space-x-1"
                    >
                      <i className="fas fa-truck text-xs"></i>
                      <span>Agent</span>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to={
                      user?.userType === 'admin' ? '/admin/dashboard' : 
                      user?.userType === 'deliveryAgent' ? '/delivery-agent/dashboard' :
                      '/customer/dashboard'
                    }
                    className="px-4 py-2 rounded-lg text-secondary-700 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-secondary-800 transition-all duration-200 font-medium flex items-center space-x-2"
                  >
                    <i className="fas fa-tachometer-alt text-sm"></i>
                    <span>Dashboard</span>
                  </Link>
                  
                  {/* User Profile - Clickable for customers and delivery agents, display only for admin */}
                  {user?.userType === 'customer' ? (
                    <Link
                      to="/customer/profile"
                      className="flex items-center space-x-2 px-3 py-2 bg-secondary-100 dark:bg-secondary-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-success-500 to-success-600 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                        <i className="fas fa-user text-white text-xs"></i>
                      </div>
                      <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 hidden lg:inline">
                        {user?.name}
                      </span>
                      <i className="fas fa-chevron-right text-xs text-secondary-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 hidden lg:inline"></i>
                    </Link>
                  ) : user?.userType === 'deliveryAgent' ? (
                    <Link
                      to="/delivery-agent/profile"
                      className="flex items-center space-x-2 px-3 py-2 bg-secondary-100 dark:bg-secondary-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-success-500 to-success-600 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                        <i className="fas fa-user text-white text-xs"></i>
                      </div>
                      <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 hidden lg:inline">
                        {user?.agentName || user?.name}
                      </span>
                      <i className="fas fa-chevron-right text-xs text-secondary-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 hidden lg:inline"></i>
                    </Link>
                  ) : user?.userType === 'admin' ? (
                    <Link
                      to="/admin/profile"
                      className="flex items-center space-x-2 px-3 py-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-success-500 to-success-600 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                        <i className="fas fa-user text-white text-xs"></i>
                      </div>
                      <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 hidden lg:inline">
                        {user?.adminName || user?.name}
                      </span>
                      <i className="fas fa-chevron-right text-xs text-secondary-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 hidden lg:inline"></i>
                    </Link>
                  ) : (
                    <div className="flex items-center space-x-2 px-3 py-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-success-500 to-success-600 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-white text-xs"></i>
                      </div>
                      <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 hidden lg:inline">
                        {user?.adminName || user?.name}
                      </span>
                    </div>
                  )}
                  
                  {/* Logout button for all authenticated users */}
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-lg text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-all duration-200 font-medium flex items-center space-x-2"
                  >
                    <i className="fas fa-sign-out-alt text-sm"></i>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                <motion.i
                  key={isMobileMenuOpen ? 'close' : 'menu'}
                  className={isMobileMenuOpen ? 'fas fa-times text-lg' : 'fas fa-bars text-lg'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="md:hidden overflow-hidden bg-white dark:bg-secondary-900 border-t border-secondary-200 dark:border-secondary-700"
            >
              <div className="px-4 py-6 space-y-4">
                {/* Navigation Links */}
                {getNavItems().map((item, index) => (
                  <motion.div key={item.to} variants={mobileItemVariants}>
                    <Link
                      to={item.to}
                      className={clsx(
                        'flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200',
                        isActiveRoute(item.to)
                          ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30'
                          : 'text-secondary-700 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                      )}
                    >
                      <i className={`${item.icon} text-lg w-6`}></i>
                      <span>{item.label}</span>
                    </Link>
                  </motion.div>
                ))}

                <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4 mt-4">
                  {!isAuthenticated() ? (
                    <>
                      {/* Customer Authentication - Primary */}
                      <motion.div variants={mobileItemVariants}>
                        <Link
                          to="/customer/login"
                          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary-700 dark:text-secondary-300 hover:bg-primary-50 dark:hover:bg-secondary-800 font-medium transition-all duration-200"
                        >
                          <i className="fas fa-sign-in-alt text-lg w-6"></i>
                          <span>Customer Login</span>
                        </Link>
                      </motion.div>
                      <motion.div variants={mobileItemVariants}>
                        <Link
                          to="/customer/register"
                          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-white bg-primary-600 hover:bg-primary-700 font-medium transition-all duration-200 mb-4"
                        >
                          <i className="fas fa-user-plus text-lg w-6"></i>
                          <span>Register Now</span>
                        </Link>
                      </motion.div>
                      
                      {/* Admin/Delivery Agent Section - Secondary */}
                      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
                        <div className="text-xs text-secondary-500 dark:text-secondary-400 mb-2 px-4">Staff Portal</div>
                        <motion.div variants={mobileItemVariants}>
                          <Link
                            to="/admin"
                            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 font-medium transition-all duration-200"
                          >
                            <i className="fas fa-user-shield text-lg w-6"></i>
                            <span>Admin</span>
                          </Link>
                        </motion.div>
                        <motion.div variants={mobileItemVariants}>
                          <Link
                            to="/delivery-agent/login"
                            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 font-medium transition-all duration-200"
                          >
                            <i className="fas fa-truck text-lg w-6"></i>
                            <span>Delivery Agent</span>
                          </Link>
                        </motion.div>
                      </div>
                    </>
                  ) : (
                    <>
                      <motion.div variants={mobileItemVariants}>
                        <Link
                          to={
                            user?.userType === 'admin' ? '/admin/dashboard' : 
                            user?.userType === 'deliveryAgent' ? '/delivery-agent/dashboard' :
                            '/customer/dashboard'
                          }
                          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 font-medium transition-all duration-200"
                        >
                          <i className="fas fa-tachometer-alt text-lg w-6"></i>
                          <span>Dashboard</span>
                        </Link>
                      </motion.div>
                      {/* User Profile in Mobile Menu */}
                      {user?.userType === 'customer' ? (
                        <motion.div variants={mobileItemVariants}>
                          <Link
                            to="/customer/profile"
                            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary-700 dark:text-secondary-300 hover:bg-primary-50 dark:hover:bg-secondary-800 font-medium transition-all duration-200"
                          >
                            <i className="fas fa-user-edit text-lg w-6"></i>
                            <span>My Profile</span>
                          </Link>
                        </motion.div>
                      ) : user?.userType === 'deliveryAgent' ? (
                        <motion.div variants={mobileItemVariants}>
                          <Link
                            to="/delivery-agent/profile"
                            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary-700 dark:text-secondary-300 hover:bg-primary-50 dark:hover:bg-secondary-800 font-medium transition-all duration-200"
                          >
                            <i className="fas fa-user-edit text-lg w-6"></i>
                            <span>My Profile</span>
                          </Link>
                        </motion.div>
                      ) : user?.userType === 'admin' ? (
                        <motion.div variants={mobileItemVariants}>
                          <Link
                            to="/admin/profile"
                            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary-700 dark:text-secondary-300 hover:bg-primary-50 dark:hover:bg-secondary-800 font-medium transition-all duration-200"
                          >
                            <i className="fas fa-user-edit text-lg w-6"></i>
                            <span>Admin Profile</span>
                          </Link>
                        </motion.div>
                      ) : (
                        <motion.div variants={mobileItemVariants}>
                          <div className="flex items-center space-x-3 px-4 py-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-success-500 to-success-600 rounded-full flex items-center justify-center">
                              <i className="fas fa-user text-white text-sm"></i>
                            </div>
                            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                              {user?.adminName || user?.name}
                            </span>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Logout button for all authenticated users */}
                      <motion.div variants={mobileItemVariants}>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/30 font-medium transition-all duration-200 w-full text-left"
                        >
                          <i className="fas fa-sign-out-alt text-lg w-6"></i>
                          <span>Logout</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header; 