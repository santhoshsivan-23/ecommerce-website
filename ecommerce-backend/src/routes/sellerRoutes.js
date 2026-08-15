const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/sellerController');
const { Order } = require('../models');

const router = express.Router();

// The whole seller panel is seller-only; admins have their own console.
router.use(protect, restrictTo('seller'));

/* Dashboard */
router.get('/stats', controller.getStats);

/* Inventory */
router.get('/inventory', controller.listInventory);
router.get('/inventory/:productId/history', controller.getStockHistory);
router.patch(
  '/inventory/:productId',
  [
    body('adjustment').optional().isInt().withMessage('Adjustment must be a whole number'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock cannot be negative'),
    body('reason').optional({ values: 'falsy' }).isLength({ max: 255 }),
  ],
  validate,
  controller.adjustInventory
);

/* Customers available when raising a direct order */
router.get('/customers', controller.listCustomers);
router.post(
  '/customers',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
    body('phone').optional({ values: 'falsy' }).isMobilePhone('any').withMessage('Enter a valid phone number'),
  ],
  validate,
  controller.createCustomer
);

/* Orders. `/quote` is declared before `/:id` so it is not read as an order id. */
router.get('/orders', controller.listOrders);
router.post('/orders/quote', controller.quoteDraftOrder);

router.post(
  '/orders',
  [
    body('customerId').optional({ values: 'falsy' }),
    body('items').isArray({ min: 1 }).withMessage('Add at least one product to the order'),
    body('items.*.productId').isInt({ gt: 0 }).withMessage('Invalid product in the order'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  controller.createOrder
);

router.get('/orders/:id', controller.getOrder);

router.patch(
  '/orders/:id/status',
  [body('status').isIn(Order.ORDER_STATUSES).withMessage('Unknown order status')],
  validate,
  controller.updateOrderStatus
);

module.exports = router;
