
// Suppress deprecation warnings that interfere with development
process.env.NODE_NO_WARNINGS = '1';
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_OPTIONS = '--no-deprecation';
}


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './config.env' });

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Enhanced rate limiting with different limits for different endpoints
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: message || 'Too many requests, please try again later.'
    });
  }
});

// Apply strict rate limiting only in production to avoid hindering local development
if (process.env.NODE_ENV === 'production') {
  // General API rate limiting
  app.use('/api/', createRateLimiter(15 * 60 * 1000, 100, 'Too many API requests'));
  
  // Stricter limits for auth endpoints
  app.use('/api/auth/', createRateLimiter(15 * 60 * 1000, 20, 'Too many authentication attempts'));
  
  // Very strict limits for login attempts
  app.use('/api/auth/login', createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts'));
  app.use('/api/auth/admin/login', createRateLimiter(15 * 60 * 1000, 5, 'Too many admin login attempts'));
} else {
  // In development, use more permissive limits
  const devLimiter = createRateLimiter(1 * 60 * 1000, 1000, 'Development rate limit exceeded');
  app.use('/api/', devLimiter);
}

// CORS configuration - Allow requests from frontend
const corsOptions = {
  origin: function (origin, callback) {
    // In development, be more permissive with CORS
    if (process.env.NODE_ENV !== 'production') {
      // Allow all localhost origins in development
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
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
      // Add production domain here
      allowedOrigins.push('https://your-production-domain.com');
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
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
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body parser middleware with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ success: false, message: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport
const passport = require('./config/passport');
app.use(passport.initialize());

// Enhanced MongoDB connection with optimizations
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmsdb';
    console.log('🔗 Connecting to MongoDB:', mongoURI);
    
    const connectionOptions = {
      // Connection management
      serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
      
      // Connection pooling for better performance
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2,  // Maintain a minimum of 2 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      
      // Reliability settings
      retryWrites: true,
      retryReads: true
    };
    
    // Set mongoose-specific options
    mongoose.set('bufferCommands', false);
    
    await mongoose.connect(mongoURI, connectionOptions);
    
    console.log('✅ MongoDB connected successfully with optimized settings');
    
    // Log connection pool info in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.connection.on('connected', () => {
        console.log('📊 MongoDB connection pool info:', {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        });
      });
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 Troubleshooting tips:');
    console.error('   - Ensure MongoDB is running on port 27017');
    console.error('   - Check your MONGODB_URI in config.env');
    console.error('   - Verify network connectivity');
    process.exit(1);
  }
};

// Handle MongoDB connection events with better logging
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
  // Don't exit process on connection errors, let it retry
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected successfully');
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Connect to MongoDB
connectDB();

// Routes
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

// Payment and Billing routes
app.use('/api/payments', require('./routes/payments'));
app.use('/api/billing', require('./routes/billing'));

// File Upload routes
app.use('/api/upload', require('./routes/upload'));

// QR Code routes
app.use('/api/qr', require('./routes/qr'));

// Customer-facing routes
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customer-tracking', require('./routes/customer-tracking'));
app.use('/api/support', require('./routes/support'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));

// Enhanced security routes (Feature 2.3)
app.use('/api/security', require('./routes/security'));

// Customer experience routes (Feature 2.4)
app.use('/api/customer-experience', require('./routes/customerExperience'));

// Enhanced health check route with system info
app.get('/api/health', (req, res) => {
  const healthInfo = {
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState
    }
  };
  
  // Only include detailed info in development
  if (process.env.NODE_ENV === 'development') {
    healthInfo.version = process.version;
    healthInfo.platform = process.platform;
  }
  
  res.status(200).json(healthInfo);
});

// Enhanced error handling middleware with better logging
app.use((err, req, res, next) => {
  // Log error details
  console.error('🚨 Server Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Distinguish between different error types
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
      message: err.message,
      stack: err.stack
    } : undefined,
    timestamp: new Date().toISOString()
  });
});

// Enhanced 404 handler
app.use('*', (req, res) => {
  console.log(`📍 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`⚡ Enhanced with optimizations and security features`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`💊 Health Check: http://localhost:${PORT}/api/health`);
  }
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('📴 HTTP server closed');
  });
}); 