const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/orderController');
const { Order } = require('../models');

const router = express.Router();

// Sellers get their own scoped views under /api/seller/orders instead.
router.use(protect, restrictTo('admin'));

// `/stats` must come before `/:id` so it is not treated as an order id.
router.get('/stats', controller.adminOrderStats);
router.get('/', controller.adminListOrders);
router.get('/:id', controller.adminGetOrder);

router.patch(
  '/:id/status',
  [body('status').isIn(Order.ORDER_STATUSES).withMessage('Unknown order status')],
  validate,
  controller.adminUpdateStatus
);

router.patch(
  '/:id/payment-status',
  [body('paymentStatus').isIn(Order.PAYMENT_STATUSES).withMessage('Unknown payment status')],
  validate,
  controller.adminUpdatePaymentStatus
);

module.exports = router;
