import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const Input = forwardRef(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
  touched, // Extract touched to prevent it from being passed to DOM
  ...props
}, ref) => {
  const baseClasses = 'border rounded-xl transition-all duration-300 bg-white dark:bg-secondary-800 placeholder-secondary-400 dark:placeholder-secondary-500 text-secondary-900 dark:text-white';

  const variants = {
    default: 'border-secondary-300 dark:border-secondary-600 focus:ring-4 focus:ring-primary-300 focus:border-primary-500',
    error: 'border-danger-300 dark:border-danger-600 focus:ring-4 focus:ring-danger-300 focus:border-danger-500',
    success: 'border-success-300 dark:border-success-600 focus:ring-4 focus:ring-success-300 focus:border-success-500'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[2.5rem]',
    md: 'px-4 py-3 text-base min-h-[3rem]',
    lg: 'px-5 py-4 text-lg min-h-[3.5rem]'
  };

  const inputVariant = error ? 'error' : variant;

  const inputClasses = clsx(
    baseClasses,
    variants[inputVariant],
    sizes[size],
    leftIcon && 'pl-12',
    rightIcon && 'pr-12',
    fullWidth ? 'w-full' : 'w-full', // Always full width by default
    className
  );

  const inputVariants = {
    initial: { scale: 1 },
    focus: { scale: 1.02 }
  };

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
          {label}
          {props.required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className={`${leftIcon} text-secondary-400 dark:text-secondary-500`}></i>
          </div>
        )}
        
        <motion.input
          ref={ref}
          className={inputClasses}
          variants={inputVariants}
          initial="initial"
          whileFocus="focus"
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <i className={`${rightIcon} text-secondary-400 dark:text-secondary-500`}></i>
          </div>
        )}
      </div>
      
      {error && (
        <motion.p 
          className="mt-2 text-sm text-danger-600 dark:text-danger-400 flex items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <i className="fas fa-exclamation-circle mr-1"></i>
          {error}
        </motion.p>
      )}
      
      {helper && !error && (
        <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
          {helper}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 