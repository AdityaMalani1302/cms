import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white focus:ring-primary-300 shadow-lg hover:shadow-xl',
    secondary: 'bg-white border-2 border-secondary-300 hover:border-secondary-400 text-secondary-700 hover:text-secondary-800 focus:ring-secondary-300 shadow-lg hover:shadow-xl',
    success: 'bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 text-white focus:ring-success-300 shadow-lg hover:shadow-xl',
    warning: 'bg-gradient-to-r from-warning-600 to-warning-700 hover:from-warning-700 hover:to-warning-800 text-white focus:ring-warning-300 shadow-lg hover:shadow-xl',
    danger: 'bg-gradient-to-r from-danger-600 to-danger-700 hover:from-danger-700 hover:to-danger-800 text-white focus:ring-danger-300 shadow-lg hover:shadow-xl',
    ghost: 'text-secondary-700 hover:text-primary-600 hover:bg-primary-50 focus:ring-primary-300',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white focus:ring-primary-300'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  };

  const buttonClasses = clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className
  );

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: disabled ? 1 : 1.05,
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: disabled ? 1 : 0.95,
      transition: { duration: 0.1 }
    }
  };

  return (
    <motion.button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      {...props}
    >
      {loading && (
        <i className="fas fa-spinner fa-spin mr-2"></i>
      )}
      {!loading && leftIcon && (
        <i className={`${leftIcon} mr-2`}></i>
      )}
      {children}
      {!loading && rightIcon && (
        <i className={`${rightIcon} ml-2`}></i>
      )}
    </motion.button>
  );
};

export default Button; 