const { validationResult } = require('express-validator');
const express = require('express');

// Generic response helpers
const sendSuccess = (res, data, message = 'Success', stats = null) => {
  const response = { success: true, message, data };
  if (stats) response.stats = stats;
  res.json(response);
};

const sendError = (res, message, statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  res.status(statusCode).json(response);
};

// Validate ObjectId format
const validateObjectId = (id) => {
  return id.match(/^[0-9a-fA-F]{24}$/);
};

// Generic query builder for consistent pagination, filtering, and sorting
const buildQuery = (req, Model, additionalFilters = {}) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    sortBy = 'createdAt',
    sortOrder = 'desc',
    ...filters 
  } = req.query;

  let query = { ...additionalFilters };

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== '') {
      if (key.includes('From') || key.includes('To')) {
        // Date range handling
        const field = key.replace('From', '').replace('To', '');
        if (!query[field]) query[field] = {};
        
        if (key.includes('From')) {
          query[field].$gte = new Date(value);
        } else {
          query[field].$lte = new Date(value);
        }
      } else {
        query[key] = value;
      }
    }
  });

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return {
    query,
    sort,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    },
    search
  };
};

// Generic statistics calculator
const calculateStats = async (Model, query, statsConfig) => {
  const stats = {};
  
  // Total count
  stats.total = await Model.countDocuments(query);

  // Custom stat calculations based on config
  if (statsConfig) {
    for (const [statKey, statConfig] of Object.entries(statsConfig)) {
      if (statConfig.field && statConfig.values) {
        // Count documents matching specific field values
        if (Array.isArray(statConfig.values)) {
          stats[statKey] = await Model.countDocuments({ 
            ...query, 
            [statConfig.field]: { $in: statConfig.values } 
          });
        } else {
          stats[statKey] = await Model.countDocuments({ 
            ...query, 
            [statConfig.field]: statConfig.values 
          });
        }
      }
    }
  }

  return stats;
};

// Main generic CRUD controller factory
const createGenericCRUD = (Model, config = {}) => {
  const {
    populateFields = '',
    searchFields = ['name'],
    allowedUpdateFields = [],
    statsConfig = null,
    customFilters = null,
    beforeCreate = null,
    beforeUpdate = null,
    afterCreate = null,
    afterUpdate = null,
    afterDelete = null
  } = config;

  return {
    // GET /api/resource - Get all with pagination, filtering, and search
    getAll: async (req, res) => {
      try {
        // Build base query with any custom filters
        let baseQuery = {};
        if (customFilters) {
          baseQuery = await customFilters(req);
        }

        const { query, sort, pagination, search } = buildQuery(req, Model, baseQuery);

        // Add search functionality
        if (search && searchFields.length > 0) {
          query.$or = searchFields.map(field => ({
            [field]: { $regex: search, $options: 'i' }
          }));
        }

        // Execute query
        const data = await Model.find(query)
          .populate(populateFields)
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip);

        // Calculate stats if config provided
        let stats = null;
        if (statsConfig) {
          stats = await calculateStats(Model, query, statsConfig);
        }

        // Calculate total for pagination
        const total = await Model.countDocuments(query);

        sendSuccess(res, data, 'Data retrieved successfully', {
          ...stats,
          pagination: {
            current: pagination.page,
            pages: Math.ceil(total / pagination.limit),
            total,
            limit: pagination.limit
          }
        });
      } catch (error) {
        console.error('Generic getAll error:', error);
        sendError(res, 'Server error');
      }
    },

    // GET /api/resource/:id - Get single item
    getById: async (req, res) => {
      try {
        if (!validateObjectId(req.params.id)) {
          return sendError(res, 'Invalid ID format', 400);
        }

        const item = await Model.findById(req.params.id).populate(populateFields);
        
        if (!item) {
          return sendError(res, `${Model.modelName} not found`, 404);
        }

        sendSuccess(res, item, `${Model.modelName} retrieved successfully`);
      } catch (error) {
        console.error('Generic getById error:', error);
        sendError(res, 'Server error');
      }
    },

    // POST /api/resource - Create new item
    create: async (req, res) => {
      try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return sendError(res, 'Validation failed', 400, errors.array());
        }

        let data = req.body;

        // Execute beforeCreate hook if provided
        if (beforeCreate) {
          data = await beforeCreate(data, req);
        }

        const item = new Model(data);
        await item.save();

        // Execute afterCreate hook if provided
        if (afterCreate) {
          await afterCreate(item, req);
        }

        sendSuccess(res, item, `${Model.modelName} created successfully`);
      } catch (error) {
        console.error('Generic create error:', error);
        if (error.code === 11000) {
          return sendError(res, 'Duplicate entry', 400);
        }
        sendError(res, 'Server error');
      }
    },

    // PUT /api/resource/:id - Update item
    update: async (req, res) => {
      try {
        if (!validateObjectId(req.params.id)) {
          return sendError(res, 'Invalid ID format', 400);
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return sendError(res, 'Validation failed', 400, errors.array());
        }

        const item = await Model.findById(req.params.id);
        if (!item) {
          return sendError(res, `${Model.modelName} not found`, 404);
        }

        let updateData = req.body;

        // Filter allowed fields if specified
        if (allowedUpdateFields.length > 0) {
          updateData = {};
          allowedUpdateFields.forEach(field => {
            if (req.body[field] !== undefined) {
              updateData[field] = req.body[field];
            }
          });
        }

        // Execute beforeUpdate hook if provided
        if (beforeUpdate) {
          updateData = await beforeUpdate(updateData, item, req);
        }

        Object.assign(item, updateData);
        await item.save();

        // Execute afterUpdate hook if provided
        if (afterUpdate) {
          await afterUpdate(item, req);
        }

        sendSuccess(res, item, `${Model.modelName} updated successfully`);
      } catch (error) {
        console.error('Generic update error:', error);
        sendError(res, 'Server error');
      }
    },

    // DELETE /api/resource/:id - Delete item
    delete: async (req, res) => {
      try {
        if (!validateObjectId(req.params.id)) {
          return sendError(res, 'Invalid ID format', 400);
        }

        const item = await Model.findById(req.params.id);
        if (!item) {
          return sendError(res, `${Model.modelName} not found`, 404);
        }

        await Model.findByIdAndDelete(req.params.id);

        // Execute afterDelete hook if provided
        if (afterDelete) {
          await afterDelete(item, req);
        }

        sendSuccess(res, null, `${Model.modelName} deleted successfully`);
      } catch (error) {
        console.error('Generic delete error:', error);
        sendError(res, 'Server error');
      }
    },

    // GET /api/resource/stats - Get statistics only
    getStats: async (req, res) => {
      try {
        let baseQuery = {};
        if (customFilters) {
          baseQuery = await customFilters(req);
        }

        const { query } = buildQuery(req, Model, baseQuery);
        
        let stats = { total: await Model.countDocuments(query) };
        
        if (statsConfig) {
          stats = await calculateStats(Model, query, statsConfig);
        }

        sendSuccess(res, stats, 'Statistics retrieved successfully');
      } catch (error) {
        console.error('Generic getStats error:', error);
        sendError(res, 'Server error');
      }
    }
  };
};

// Create Express router with generic routes
const createGenericRoutes = ({ model, config, customLogic = {} }) => {
  const router = express.Router();
  
  // Combine config with custom logic
  const fullConfig = {
    populateFields: config.populateFields || '',
    searchFields: config.searchFields || ['name'],
    allowedUpdateFields: config.allowedUpdateFields || [],
    statsConfig: config.statsConfig || null,
    customFilters: customLogic.beforeQuery || null,
    beforeCreate: customLogic.beforeCreate || null,
    beforeUpdate: customLogic.beforeUpdate || null,
    afterCreate: customLogic.afterCreate || null,
    afterUpdate: customLogic.afterUpdate || null,
    afterDelete: customLogic.afterDelete || null
  };

  // Create CRUD operations
  const crud = createGenericCRUD(model, fullConfig);

  // Define routes
  router.get('/', crud.getAll);
  router.get('/stats', crud.getStats);
  router.get('/:id', crud.getById);
  router.post('/', crud.create);
  router.put('/:id', crud.update);
  router.delete('/:id', crud.delete);

  return router;
};

// Export utilities and main factory
module.exports = {
  createGenericCRUD,
  createGenericRoutes,
  sendSuccess,
  sendError,
  validateObjectId,
  buildQuery,
  calculateStats
}; 