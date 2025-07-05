import React from 'react';
import DataManager from '../../components/admin/DataManager';
import { courierConfig } from '../../config/adminPageConfigs';

const CourierManagement = () => {
  return <DataManager config={courierConfig} />;
};

export default CourierManagement; 