const express = require('express');
const Page = require('../models/Page');

const router = express.Router();

// @route   GET /api/pages/:pageType
// @desc    Get page content by type
// @access  Public
router.get('/:pageType', async (req, res) => {
  try {
    const { pageType } = req.params;
    
    const page = await Page.findOne({ pageType });
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    res.json({
      success: true,
      data: {
        pageType: page.pageType,
        pageTitle: page.pageTitle,
        pageDescription: page.pageDescription,
        email: page.email,
        mobileNumber: page.mobileNumber
      }
    });
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 