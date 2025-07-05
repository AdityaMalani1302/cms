const express = require('express');
const { uploadMiddleware, cleanupFiles, handleUploadError } = require('../middleware/upload');
const { authUser, authDeliveryAgent, authAdmin } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const router = express.Router();

// @route   POST /api/upload/proof-of-delivery/:courierId
// @desc    Upload proof of delivery files (photos, signatures)
// @access  Private (Delivery Agent)
router.post('/proof-of-delivery/:courierId', [
  authDeliveryAgent,
  uploadMiddleware.proofOfDelivery()
], async (req, res) => {
  try {
    const { courierId } = req.params;
    const { notes, recipientName } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one proof file is required'
      });
    }

    // Find courier and update with proof of delivery
    const Courier = require('../models/Courier');
    const courier = await Courier.findById(courierId);
    
    if (!courier) {
      cleanupFiles(req.files);
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }

    // Check if delivery agent is assigned to this courier
    if (courier.assignedAgent.toString() !== req.agent._id.toString()) {
      cleanupFiles(req.files);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Prepare proof of delivery data
    const proofFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: file.url || file.path.replace(__dirname + '/../', ''),
      uploadedAt: new Date()
    }));

    // Update courier with proof of delivery
    courier.proofOfDelivery = {
      files: proofFiles,
      notes: notes || '',
      recipientName: recipientName || '',
      deliveredBy: req.agent._id,
      deliveredAt: new Date()
    };
    
    courier.status = 'Delivered';
    courier.actualDeliveryDate = new Date();
    
    await courier.save();

    res.json({
      success: true,
      message: 'Proof of delivery uploaded successfully',
      data: {
        courier: courier._id,
        proofFiles: proofFiles.length,
        deliveredAt: courier.actualDeliveryDate
      }
    });
  } catch (error) {
    console.error('Proof of delivery upload error:', error);
    cleanupFiles(req.files);
    res.status(500).json({
      success: false,
      message: 'Failed to upload proof of delivery'
    });
  }
});

// @route   POST /api/upload/issue-evidence/:courierId
// @desc    Upload evidence files for delivery issues
// @access  Private (Delivery Agent)
router.post('/issue-evidence/:courierId', [
  authDeliveryAgent,
  uploadMiddleware.issueEvidence()
], async (req, res) => {
  try {
    const { courierId } = req.params;
    const { issueType, description, severity } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one evidence file is required'
      });
    }

    // Find courier
    const Courier = require('../models/Courier');
    const courier = await Courier.findById(courierId);
    
    if (!courier) {
      cleanupFiles(req.files);
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }

    // Check if delivery agent is assigned to this courier
    if (courier.assignedAgent.toString() !== req.agent._id.toString()) {
      cleanupFiles(req.files);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Prepare evidence files data
    const evidenceFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: file.url || file.path.replace(__dirname + '/../', ''),
      uploadedAt: new Date()
    }));

    // Create issue report
    const issueReport = {
      type: issueType || 'delivery_issue',
      description: description || '',
      severity: severity || 'medium',
      evidenceFiles,
      reportedBy: req.agent._id,
      reportedAt: new Date(),
      status: 'open'
    };

    // Add to courier's issue reports
    if (!courier.issueReports) {
      courier.issueReports = [];
    }
    courier.issueReports.push(issueReport);
    
    // Update courier status based on issue type
    if (issueType === 'delivery_failed') {
      courier.status = 'Delivery Failed';
    } else if (issueType === 'damage') {
      courier.status = 'Damaged';
    }
    
    await courier.save();

    res.json({
      success: true,
      message: 'Issue evidence uploaded successfully',
      data: {
        courier: courier._id,
        issueId: issueReport._id,
        evidenceFiles: evidenceFiles.length
      }
    });
  } catch (error) {
    console.error('Issue evidence upload error:', error);
    cleanupFiles(req.files);
    res.status(500).json({
      success: false,
      message: 'Failed to upload issue evidence'
    });
  }
});

// @route   POST /api/upload/document
// @desc    Upload documents (general purpose)
// @access  Private (User/Admin)
router.post('/document', [
  authUser,
  uploadMiddleware.singleDocument('document', 'document')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Document file is required'
      });
    }

    const fileData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: req.file.url || req.file.path.replace(__dirname + '/../', ''),
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: fileData
    });
  } catch (error) {
    console.error('Document upload error:', error);
    cleanupFiles(req.file);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
});

// @route   POST /api/upload/image
// @desc    Upload single image with processing
// @access  Private (User/Admin)
router.post('/image', [
  authUser,
  uploadMiddleware.singleImage('image', 'image')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }

    const imageData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: req.file.url || req.file.path.replace(__dirname + '/../', ''),
      processedPath: req.file.processedPath,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Image uploaded and processed successfully',
      data: imageData
    });
  } catch (error) {
    console.error('Image upload error:', error);
    cleanupFiles(req.file);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
});

// @route   POST /api/upload/multiple-images
// @desc    Upload multiple images with processing
// @access  Private (User/Admin)
router.post('/multiple-images', [
  authUser,
  uploadMiddleware.multipleImages('images', 10, 'image')
], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image file is required'
      });
    }

    const imagesData = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: file.url || file.path.replace(__dirname + '/../', ''),
      processedPath: file.processedPath,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    }));

    res.json({
      success: true,
      message: `${imagesData.length} images uploaded and processed successfully`,
      data: imagesData
    });
  } catch (error) {
    console.error('Multiple images upload error:', error);
    cleanupFiles(req.files);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images'
    });
  }
});

// @route   GET /api/upload/file/:filename
// @desc    Serve uploaded files
// @access  Private (User/Delivery Agent/Admin)
router.get('/file/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { type = 'image' } = req.query;
    
    let filePath;
    switch (type) {
      case 'document':
        filePath = path.join(__dirname, '../uploads/documents', filename);
        break;
      case 'proof':
        filePath = path.join(__dirname, '../uploads/proof-of-delivery', filename);
        break;
      case 'issue':
        filePath = path.join(__dirname, '../uploads/issues', filename);
        break;
      default:
        filePath = path.join(__dirname, '../uploads/images', filename);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve file'
    });
  }
});

// @route   POST /api/upload/qr-code/:courierId
// @desc    Generate and upload QR code for courier package
// @access  Private (Admin/Delivery Agent)
router.post('/qr-code/:courierId', async (req, res) => {
  try {
    const { courierId } = req.params;
    
    // Find courier
    const Courier = require('../models/Courier');
    const courier = await Courier.findById(courierId);
    
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }

    // Generate QR code data
    const qrData = {
      courierId: courier._id,
      refNumber: courier.refNumber,
      trackingUrl: `${process.env.FRONTEND_URL}/track/${courier.refNumber}`,
      generatedAt: new Date().toISOString()
    };

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Save QR code to file
    const qrBuffer = Buffer.from(qrCodeUrl.split(',')[1], 'base64');
    const qrFilename = `qr_${courier.refNumber}_${Date.now()}.png`;
    const qrFilePath = path.join(__dirname, '../uploads/qr-codes', qrFilename);
    
    // Ensure QR codes directory exists
    const qrDir = path.join(__dirname, '../uploads/qr-codes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
    
    fs.writeFileSync(qrFilePath, qrBuffer);

    // Update courier with QR code information
    courier.qrCode = {
      filename: qrFilename,
      url: `uploads/qr-codes/${qrFilename}`,
      data: qrData,
      generatedAt: new Date()
    };
    
    await courier.save();

    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        qrCodeUrl: qrCodeUrl,
        filename: qrFilename,
        trackingUrl: qrData.trackingUrl
      }
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code'
    });
  }
});

// @route   DELETE /api/upload/file/:filename
// @desc    Delete uploaded file (Admin only)
// @access  Private (Admin)
router.delete('/file/:filename', authAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    const { type = 'image' } = req.query;
    
    let filePath;
    switch (type) {
      case 'document':
        filePath = path.join(__dirname, '../uploads/documents', filename);
        break;
      case 'proof':
        filePath = path.join(__dirname, '../uploads/proof-of-delivery', filename);
        break;
      case 'issue':
        filePath = path.join(__dirname, '../uploads/issues', filename);
        break;
      default:
        filePath = path.join(__dirname, '../uploads/images', filename);
    }
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// Error handling middleware
router.use(handleUploadError);

module.exports = router; 