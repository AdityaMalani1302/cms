import React, { useState } from 'react';

const PasswordInput = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  placeholder = "Enter your password",
  required = false,
  className = '',
  icon,
  maxLength,
  minLength,
  disabled = false,
  autoComplete = 'current-password',
  id,
  helpText,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const baseInputClass = `
    w-full px-4 py-3 pr-12 border rounded-lg transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    ${error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    dark:bg-gray-700 dark:border-gray-600 dark:text-white
    ${className}
  `.trim();

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id || name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {icon && <i className={`${icon} mr-2 text-primary-500`}></i>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          id={id || name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          disabled={disabled}
          autoComplete={autoComplete}
          className={baseInputClass}
          {...props}
        />
        
        {/* Password Toggle Button */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
          tabIndex={-1}
        >
          {showPassword ? (
            <svg 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L8.464 8.464m1.414 1.414l1.414-1.414M9.878 9.878l1.414-1.414m0 0L9.878 9.878m1.414-1.414l2.122 2.122" 
              />
            </svg>
          ) : (
            <svg 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
              />
            </svg>
          )}
        </button>
        
        {/* Error Icon */}
        {error && (
          <div className="absolute inset-y-0 right-10 pr-3 flex items-center pointer-events-none">
            <i className="fas fa-exclamation-circle text-red-500"></i>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <p className="text-red-600 text-xs mt-1 flex items-center">
          <i className="fas fa-exclamation-triangle mr-1"></i>
          {error}
        </p>
      )}
      
      {/* Help Text */}
      {helpText && !error && (
        <p className="text-gray-500 text-xs mt-1">
          {helpText}
        </p>
      )}
      
      {/* Character Count */}
      {maxLength && value && (
        <p className="text-gray-500 text-xs mt-1 text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
};

export default PasswordInput; 