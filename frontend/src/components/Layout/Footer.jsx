import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

const Footer = () => {
  const contactInfo = [
    { icon: 'fas fa-map-marker-alt', text: '#890 CFG Apartment, Mayur Vihar, Delhi-India' },
    { icon: 'fas fa-phone', text: '+91 1234567890' },
    { icon: 'fas fa-envelope', text: 'info@cms.com' }
  ];

  const socialLinks = [
    { icon: 'fab fa-facebook', href: 'https://facebook.com', color: 'hover:text-blue-500' },
    { icon: 'fab fa-twitter', href: 'https://twitter.com', color: 'hover:text-blue-400' },
    { icon: 'fab fa-instagram', href: 'https://instagram.com', color: 'hover:text-pink-500' },
    { icon: 'fab fa-linkedin', href: 'https://linkedin.com', color: 'hover:text-blue-600' }
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <footer className="bg-secondary-900 dark:bg-secondary-950 text-white mt-auto">
      {/* Main Footer */}
      <div className="bg-gradient-to-br from-secondary-800 to-secondary-900 dark:from-secondary-900 dark:to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Company Info */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-shipping-fast text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gradient bg-gradient-to-r from-white to-primary-300 bg-clip-text text-transparent">
                    CMS
                  </h3>
                  <p className="text-sm text-secondary-400">Courier Management System</p>
                </div>
              </div>
              <p className="text-secondary-300 leading-relaxed mb-6 max-w-md">
                We are committed to providing reliable and efficient courier services 
                worldwide. Track your packages and manage deliveries with ease using 
                our state-of-the-art technology.
              </p>
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={index}
                    href={social.href}
                    className={`w-10 h-10 bg-secondary-800 hover:bg-secondary-700 rounded-xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 hover:shadow-lg ${social.color}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <i className={`${social.icon} text-lg`}></i>
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div variants={itemVariants}>
              <h4 className="text-lg font-semibold mb-6 text-white">Contact Info</h4>
              <ul className="space-y-4">
                {contactInfo.map((contact, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-6 h-6 bg-primary-500/20 rounded-lg flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <i className={`${contact.icon} text-primary-400 text-sm`}></i>
                    </div>
                    <span className="text-secondary-300 leading-relaxed">
                      {contact.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Newsletter Signup */}
              <div className="mt-8">
                <h5 className="text-sm font-semibold mb-3 text-white">Stay Updated</h5>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-2 bg-secondary-800 border border-secondary-700 rounded-l-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-secondary-400 transition-all duration-300"
                  />
                  <button className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-r-xl transition-all duration-300 transform hover:scale-105">
                    <i className="fas fa-paper-plane text-white"></i>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-secondary-950 dark:bg-black border-t border-secondary-800 dark:border-secondary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row justify-between items-center"
          >
            <p className="text-secondary-400 text-sm">
              &copy; {new Date().getFullYear()} Courier Management System. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <button 
                onClick={() => toast.info('Privacy Policy page coming soon!')}
                className="text-secondary-400 hover:text-white text-sm transition-colors duration-200"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => toast.info('Terms of Service page coming soon!')}
                className="text-secondary-400 hover:text-white text-sm transition-colors duration-200"
              >
                Terms of Service
              </button>
              <button 
                onClick={() => toast.info('Support page coming soon!')}
                className="text-secondary-400 hover:text-white text-sm transition-colors duration-200"
              >
                Support
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 