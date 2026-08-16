const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/uploadController');

const router = express.Router();

// Protected upload endpoint for Admin and Seller
router.post('/', protect, restrictTo('admin', 'seller', 'customer'), controller.uploadImage);

module.exports = router;
