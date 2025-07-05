const express = require('express');
const { createGenericRoutes } = require('../controllers/genericController');
const Branch = require('../models/Branch');
const { branchConfig } = require('../config/routeConfigs');

const router = express.Router();

// Use generic controller for all CRUD operations
const branchRoutes = createGenericRoutes({
  model: Branch,
  config: branchConfig,
  publicAccess: true // Branches are publicly accessible
});

router.use('/', branchRoutes);

module.exports = router;
 