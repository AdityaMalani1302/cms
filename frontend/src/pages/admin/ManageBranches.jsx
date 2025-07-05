import React from 'react';
import DataManager from '../../components/admin/DataManager';
import { branchConfig } from '../../config/adminPageConfigs';

const ManageBranches = () => {
  return <DataManager config={branchConfig} />;
};

export default ManageBranches; 