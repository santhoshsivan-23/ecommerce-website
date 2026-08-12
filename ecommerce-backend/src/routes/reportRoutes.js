const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/reportController');

const router = express.Router();

// Reporting spans every seller's data, so it is admin-only.
router.use(protect, restrictTo('admin'));

router.get('/sales', controller.getSalesReport);
router.get('/products', controller.getProductReport);
router.get('/sellers', controller.getSellerReport);
router.get('/payments', controller.getPaymentReport);
router.get('/order-source', controller.getOrderSourceReport);
router.get('/analytics', controller.getAnalytics);

module.exports = router;
