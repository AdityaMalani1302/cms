
// Optimize Node.js environment
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_OPTIONS = '--no-deprecation --max-old-space-size=4096';
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
// Rate limiting removed
const logger = require('./utils/logger');
const { validateSessionMiddleware } = require('./middleware/sessionManager');
require('dotenv').config({ path: './config.env' });

const app = express();

// Trust proxy configuration
app.set('trust proxy', 1);

// Enhanced Security middleware with comprehensive CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind CSS
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Only for development - remove in production
        process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : null
      ].filter(Boolean),
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "https://via.placeholder.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://fonts.googleapis.com"
      ],
      connectSrc: [
        "'self'",
        "wss://localhost:5000", // WebSocket connections
        process.env.NODE_ENV === 'development' ? 'ws://localhost:3000' : null,
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
      ].filter(Boolean),
      frameSrc: [
        "'self'"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'"],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permittedCrossDomainPolicies: false,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  ieNoOpen: true,
  originAgentCluster: true,
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting removed for simplified college project

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV !== 'production') {
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (process.env.NODE_ENV === 'production') {
      allowedOrigins.push('https://your-production-domain.com');
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.security('CORS blocked origin', { origin });
      callback(process.env.NODE_ENV === 'production' ? new Error('Not allowed by CORS') : null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
  if (!res.getHeader('Access-Control-Allow-Credentials')) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply session validation middleware globally, except for auth routes and public routes
app.use('/api', (req, res, next) => {
  // Skip authentication for public routes
  const publicRoutes = [
    '/auth/',
    '/delivery-agent/login',
    '/health',
    '/contact',
    '/pages/',
    '/branches',
    '/chatbot/',
    '/customer-tracking/',
    '/tracking/',
    '/pricing/',
    '/complaints'
  ];
  
  // Check if the current path should skip authentication
  const shouldSkip = publicRoutes.some(route => req.path.startsWith(route));
  
  // Debug logging for delivery agent login route
  if (req.path === '/delivery-agent/login') {
    logger.debug('Delivery agent login route detected', {
      path: req.path,
      shouldSkip,
      method: req.method
    });
  }
  
  if (shouldSkip) {
    logger.debug('Skipping session validation for route', { path: req.path });
    return next();
  }
  
  // Apply session validation for protected routes
  validateSessionMiddleware(req, res, next);
});


// Initialize Passport
const passport = require('./config/passport');
app.use(passport.initialize());


// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req.method, req.originalUrl, res.statusCode, duration);
    
    // Performance monitoring
    logger.performance('request_duration', duration, 1000);
  });
  next();
});

// Enhanced MongoDB connection with optimizations
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmsdb';
    logger.database('Connecting to MongoDB', { uri: mongoURI.replace(/\/\/.*@/, '//***:***@') });
    
    const connectionOptions = {
      serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true
    };
    
    mongoose.set('bufferCommands', false);
    await mongoose.connect(mongoURI, connectionOptions);
    
    logger.success('MongoDB connected with optimized settings');
    
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  logger.database('MongoDB connected');
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error', { error: error.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected, attempting to reconnect');
});

mongoose.connection.on('reconnected', () => {
  logger.database('MongoDB reconnected');
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
});

// Connect to MongoDB
connectDB();

// Routes - organized for better maintainability
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/delivery-agent', require('./routes/deliveryAgent'));
app.use('/api/courier', require('./routes/courier'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/pages', require('./routes/pages'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customer-tracking', require('./routes/customer-tracking'));
app.use('/api/support', require('./routes/support'));
// Reviews system removed
app.use('/api/security', require('./routes/security'));
app.use('/api/customer-experience', require('./routes/customerExperience'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/pricing', require('./routes/pricing'));

// Enhanced health check route
app.get('/api/health', (req, res) => {
  const healthInfo = {
    status: 'OK',
    message: 'CMS Server Running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  };
  
  if (process.env.NODE_ENV === 'development') {
    healthInfo.memory = process.memoryUsage();
    healthInfo.version = process.version;
  }
  
  res.status(200).json(healthInfo);
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server Error', {
    message: err.message,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  let status = 500;
  let message = 'Internal Server Error';
  
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (err.name === 'MongoError' && err.code === 11000) {
    status = 409;
    message = 'Duplicate data conflict';
  } else if (err.status) {
    status = err.status;
    message = err.message;
  }
  
  res.status(status).json({ 
    success: false, 
    message,
    error: process.env.NODE_ENV === 'development' ? {
      name: err.name,
      message: err.message
    } : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', { method: req.method, url: req.originalUrl });
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.startup('CMS Backend', `Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.info(`API Base URL: http://localhost:${PORT}/api`);
    logger.info(`Health Check: http://localhost:${PORT}/api/health`);
  }
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
  });
}); 