import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center font-semibold rounded-full border transition-all duration-200';

  const variants = {
    default: 'bg-secondary-100 text-secondary-800 border-secondary-200 dark:bg-secondary-800 dark:text-secondary-200 dark:border-secondary-700',
    primary: 'bg-primary-100 text-primary-800 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-700',
    success: 'bg-success-100 text-success-800 border-success-200 dark:bg-success-900/30 dark:text-success-300 dark:border-success-700',
    warning: 'bg-warning-100 text-warning-800 border-warning-200 dark:bg-warning-900/30 dark:text-warning-300 dark:border-warning-700',
    danger: 'bg-danger-100 text-danger-800 border-danger-200 dark:bg-danger-900/30 dark:text-danger-300 dark:border-danger-700',
    pending: 'bg-warning-100 text-warning-800 border-warning-200',
    processing: 'bg-primary-100 text-primary-800 border-primary-200',
    shipped: 'bg-blue-100 text-blue-800 border-blue-200',
    delivered: 'bg-success-100 text-success-800 border-success-200',
    cancelled: 'bg-danger-100 text-danger-800 border-danger-200'
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const badgeClasses = clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    className
  );

  return (
    <motion.span
      className={badgeClasses}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {icon && <i className={`${icon} mr-1`}></i>}
      {children}
    </motion.span>
  );
};

export default Badge; 