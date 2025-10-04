import React from 'react';
import { Input } from './index';
import { getStates, getCitiesForState } from '../../data/statesAndCities';
import { getPincodesForCity } from '../../data/pincodes';

const AddressInput = ({ 
  address, 
  onChange, 
  onBlur, 
  errors, 
  touched, 
  prefix, 
  title 
}) => {
  const handleInputChange = (field, value) => {
    const updatedAddress = { ...address, [field]: value };
    
    // If state changes, clear the city field
    if (field === 'state') {
      updatedAddress.city = '';
    }
    
    onChange(`${prefix}.${field}`, value, updatedAddress);
  };

  const handleInputBlur = (field) => {
    if (onBlur) {
      // Create a mock event object to match the expected format
      const mockEvent = {
        target: {
          name: `${prefix}.${field}`
        }
      };
      onBlur(mockEvent);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      
      <div className="grid grid-cols-1 gap-4">
        <Input
          label="Street Address"
          value={address?.street || ''}
          onChange={(e) => handleInputChange('street', e.target.value)}
          onBlur={() => handleInputBlur('street')}
          error={errors?.[`${prefix}.street`]}
          touched={touched?.[`${prefix}.street`]}
          placeholder="Enter street address"
          required
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* State Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              State <span className="text-red-500">*</span>
            </label>
            <select
              value={address?.state || ''}
              onChange={(e) => handleInputChange('state', e.target.value)}
              onBlur={() => handleInputBlur('state')}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">Select State</option>
              {getStates().map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {errors?.[`${prefix}.state`] && (
              <p className="text-red-500 text-xs mt-1">{errors[`${prefix}.state`]}</p>
            )}
          </div>
          
          {/* City Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City <span className="text-red-500">*</span>
            </label>
            <select
              value={address?.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              onBlur={() => handleInputBlur('city')}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={!address?.state}
            >
              <option value="">
                {address?.state ? 'Select City' : 'Select State First'}
              </option>
              {address?.state && getCitiesForState(address.state).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {errors?.[`${prefix}.city`] && (
              <p className="text-red-500 text-xs mt-1">{errors[`${prefix}.city`]}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="PIN Code"
              value={address?.pincode || ''}
              onChange={(e) => handleInputChange('pincode', e.target.value)}
              onBlur={() => handleInputBlur('pincode')}
              error={errors?.[`${prefix}.pincode`]}
              touched={touched?.[`${prefix}.pincode`]}
              placeholder="Enter PIN code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
            {address?.city && address?.state && (
              <div className="mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Valid pincodes for {address.city}: {getPincodesForCity(address.city, address.state).slice(0, 5).join(', ')}
                  {getPincodesForCity(address.city, address.state).length > 5 && '...'}
                </p>
              </div>
            )}
          </div>
          
          <Input
            label="Country"
            value={address?.country || 'India'}
            onChange={(e) => handleInputChange('country', e.target.value)}
            onBlur={() => handleInputBlur('country')}
            error={errors?.[`${prefix}.country`]}
            touched={touched?.[`${prefix}.country`]}
            placeholder="Enter country"
            required
          />
        </div>
      </div>
    </div>
  );
};

export default AddressInput;