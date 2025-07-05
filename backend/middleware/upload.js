const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Initialize upload directories
const uploadPaths = {
  images: path.join(__dirname, '../uploads/images'),
  documents: path.join(__dirname, '../uploads/documents'),
  proofOfDelivery: path.join(__dirname, '../uploads/proof-of-delivery'),
  issues: path.join(__dirname, '../uploads/issues'),
  temp: path.join(__dirname, '../uploads/temp')
};

Object.values(uploadPaths).forEach(ensureDirectoryExists);

// File type configurations
const fileConfigs = {
  image: {
    allowedTypes: /jpeg|jpg|png|gif|webp/,
    maxSize: 5 * 1024 * 1024, // 5MB
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  },
  document: {
    allowedTypes: /pdf|doc|docx|txt/,
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  },
  any: {
    allowedTypes: /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt/,
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  }
};

// Generate unique filename
const generateUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  const ext = path.extname(originalname);
  const baseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
  return `${baseName}_${timestamp}_${random}${ext}`;
};

// Multer storage configuration
const createStorage = (uploadType = 'temp') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadPath;
      
      switch (uploadType) {
        case 'image':
          uploadPath = uploadPaths.images;
          break;
        case 'document':
          uploadPath = uploadPaths.documents;
          break;
        case 'proof-of-delivery':
          uploadPath = uploadPaths.proofOfDelivery;
          break;
        case 'issue':
          uploadPath = uploadPaths.issues;
          break;
        default:
          uploadPath = uploadPaths.temp;
      }
      
      ensureDirectoryExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = generateUniqueFilename(file.originalname);
      cb(null, uniqueName);
    }
  });
};

// File filter function
const createFileFilter = (allowedConfig) => {
  return (req, file, cb) => {
    // Check file extension
    const extname = allowedConfig.allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // Check mime type
    const mimetype = allowedConfig.mimeTypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedConfig.allowedTypes}`));
    }
  };
};

// Image processing middleware
const processImage = async (filePath, options = {}) => {
  try {
    const {
      width = 1920,
      height = 1080,
      quality = 80,
      format = 'jpeg'
    } = options;

    const processedPath = filePath.replace(/\.[^/.]+$/, `_processed.${format}`);
    
    await sharp(filePath)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .toFile(processedPath);

    // Delete original file if processing succeeded
    if (fs.existsSync(processedPath)) {
      fs.unlinkSync(filePath);
      return processedPath;
    }
    
    return filePath;
  } catch (error) {
    console.error('Image processing error:', error);
    return filePath; // Return original if processing fails
  }
};

// Multer configurations for different upload types
const createMulterConfig = (uploadType, fileType = 'any') => {
  const config = fileConfigs[fileType];
  
  return multer({
    storage: createStorage(uploadType),
    limits: {
      fileSize: config.maxSize,
      files: 10 // Maximum 10 files per request
    },
    fileFilter: createFileFilter(config)
  });
};

// Upload middleware factories
const uploadMiddleware = {
  // Single image upload
  singleImage: (fieldName = 'image', uploadType = 'image') => {
    const upload = createMulterConfig(uploadType, 'image').single(fieldName);
    
    return async (req, res, next) => {
      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
          });
        }
        
        if (req.file) {
          try {
            // Process image
            const processedPath = await processImage(req.file.path);
            req.file.processedPath = processedPath;
            req.file.url = processedPath.replace(__dirname + '/../', '');
          } catch (error) {
            console.error('Image processing error:', error);
          }
        }
        
        next();
      });
    };
  },

  // Multiple images upload
  multipleImages: (fieldName = 'images', maxCount = 5, uploadType = 'image') => {
    const upload = createMulterConfig(uploadType, 'image').array(fieldName, maxCount);
    
    return async (req, res, next) => {
      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
          });
        }
        
        if (req.files && req.files.length > 0) {
          try {
            // Process all images
            for (const file of req.files) {
              const processedPath = await processImage(file.path);
              file.processedPath = processedPath;
              file.url = processedPath.replace(__dirname + '/../', '');
            }
          } catch (error) {
            console.error('Image processing error:', error);
          }
        }
        
        next();
      });
    };
  },

  // Single document upload
  singleDocument: (fieldName = 'document', uploadType = 'document') => {
    const upload = createMulterConfig(uploadType, 'document').single(fieldName);
    
    return (req, res, next) => {
      upload(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'Document upload failed'
          });
        }
        
        if (req.file) {
          req.file.url = req.file.path.replace(__dirname + '/../', '');
        }
        
        next();
      });
    };
  },

  // Multiple files (mixed types)
  multipleFiles: (fieldName = 'files', maxCount = 10, uploadType = 'temp') => {
    const upload = createMulterConfig(uploadType, 'any').array(fieldName, maxCount);
    
    return async (req, res, next) => {
      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
          });
        }
        
        if (req.files && req.files.length > 0) {
          try {
            // Process each file
            for (const file of req.files) {
              // Process images
              if (file.mimetype.startsWith('image/')) {
                const processedPath = await processImage(file.path);
                file.processedPath = processedPath;
                file.url = processedPath.replace(__dirname + '/../', '');
              } else {
                file.url = file.path.replace(__dirname + '/../', '');
              }
            }
          } catch (error) {
            console.error('File processing error:', error);
          }
        }
        
        next();
      });
    };
  },

  // Proof of delivery upload
  proofOfDelivery: () => {
    return uploadMiddleware.multipleFiles('proofFiles', 5, 'proof-of-delivery');
  },

  // Issue evidence upload
  issueEvidence: () => {
    return uploadMiddleware.multipleFiles('evidenceFiles', 10, 'issue');
  }
};

// File cleanup utility
const cleanupFiles = (files) => {
  if (!files) return;
  
  const fileArray = Array.isArray(files) ? files : [files];
  
  fileArray.forEach(file => {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    if (file.processedPath && fs.existsSync(file.processedPath)) {
      fs.unlinkSync(file.processedPath);
    }
  });
};

// Error handling middleware for file uploads
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
    }
    
    return res.status(400).json({
      success: false,
      message,
      error: err.message
    });
  }
  
  next(err);
};

module.exports = {
  uploadMiddleware,
  processImage,
  cleanupFiles,
  handleUploadError,
  uploadPaths
}; 