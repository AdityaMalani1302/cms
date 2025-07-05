import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const Alert = ({
  children,
  variant = 'info',
  title,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
  ...props
}) => {
  const baseClasses = 'p-4 rounded-xl border transition-all duration-300';

  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    success: 'bg-success-50 border-success-200 text-success-800 dark:bg-success-900/20 dark:border-success-800 dark:text-success-300',
    warning: 'bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-300',
    danger: 'bg-danger-50 border-danger-200 text-danger-800 dark:bg-danger-900/20 dark:border-danger-800 dark:text-danger-300'
  };

  const getDefaultIcon = (variant) => {
    switch (variant) {
      case 'success':
        return 'fas fa-check-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'danger':
        return 'fas fa-exclamation-circle';
      default:
        return 'fas fa-info-circle';
    }
  };

  const alertClasses = clsx(
    baseClasses,
    variants[variant],
    className
  );

  const alertVariants = {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 }
  };

  return (
    <AnimatePresence>
      <motion.div
        className={alertClasses}
        variants={alertVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3 }}
        {...props}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <i className={`${icon || getDefaultIcon(variant)} text-lg`}></i>
          </div>
          <div className="flex-1">
            {title && (
              <h4 className="font-semibold mb-1">{title}</h4>
            )}
            <div>{children}</div>
          </div>
          {dismissible && (
            <motion.button
              onClick={onDismiss}
              className="ml-3 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <i className="fas fa-times"></i>
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Alert; 