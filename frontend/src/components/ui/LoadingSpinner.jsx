import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  text,
  className = '',
  ...props
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colors = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    white: 'text-white',
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600'
  };

  const spinnerClasses = clsx(
    'animate-spin',
    sizes[size],
    colors[color],
    className
  );

  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center space-y-2"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      {...props}
    >
      <svg
        className={spinnerClasses}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      {text && (
        <motion.p
          className={clsx('text-sm font-medium', colors[color])}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );
};

// Overlay Loading Component
export const LoadingOverlay = ({ isLoading, children, text = 'Loading...' }) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <motion.div
          className="absolute inset-0 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LoadingSpinner size="lg" text={text} />
        </motion.div>
      )}
    </div>
  );
};

// Full Page Loading Component
export const PageLoader = ({ text = 'Loading...' }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-white dark:bg-secondary-900 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center">
        <LoadingSpinner size="xl" color="primary" />
        <motion.h2
          className="mt-4 text-lg font-semibold text-secondary-800 dark:text-secondary-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.h2>
      </div>
    </motion.div>
  );
};

export default LoadingSpinner; 