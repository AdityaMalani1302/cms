import React from 'react';

const ValidatedInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  className = '',
  icon,
  maxLength,
  minLength,
  pattern,
  disabled = false,
  autoComplete = 'off',
  ...props
}) => {
  const baseInputClass = `
    w-full px-4 py-3 border rounded-lg transition-colors duration-200
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {icon && <i className={`${icon} mr-2 text-primary-500`}></i>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          disabled={disabled}
          autoComplete={autoComplete}
          className={baseInputClass}
          {...props}
        />
        
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <i className="fas fa-exclamation-circle text-red-500"></i>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-red-600 text-xs mt-1 flex items-center">
          <i className="fas fa-exclamation-triangle mr-1"></i>
          {error}
        </p>
      )}
      
      {maxLength && value && (
        <p className="text-gray-500 text-xs mt-1 text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
};

export default ValidatedInput; 