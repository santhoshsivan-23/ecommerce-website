const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/adminController');

const router = express.Router();

// Public shop settings reader (accessible by customer, seller, and admin)
router.get('/settings', controller.getSettings);

// Everything below is admin-only. Sellers have their own scoped panel under
// /api/seller and can never reach these routes.
router.use(protect, restrictTo('admin'));

router.put('/settings', controller.updateSettings);
router.patch('/settings', controller.updateSettings);

/* Dashboard */
router.get('/stats', controller.getDashboard);

/* Customers */
router.get('/customers', controller.listCustomers);
router.get('/customers/:id', controller.getCustomer);
router.get('/customers/:id/orders', controller.getCustomerOrders);
router.patch(
  '/customers/:id/status',
  [body('isActive').optional().isBoolean().withMessage('isActive must be true or false')],
  validate,
  controller.setCustomerStatus
);

/* Sellers */
router.get('/sellers', controller.listSellers);

router.post(
  '/sellers',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
    body('phone').optional({ values: 'falsy' }).isMobilePhone('any').withMessage('Enter a valid phone number'),
  ],
  validate,
  controller.createSeller
);

router.patch(
  '/sellers/:id',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').optional().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
    body('phone').optional({ values: 'falsy' }).isMobilePhone('any').withMessage('Enter a valid phone number'),
    body('password')
      .optional({ values: 'falsy' })
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
  ],
  validate,
  controller.updateSeller
);

router.patch(
  '/sellers/:id/status',
  [body('isActive').optional().isBoolean().withMessage('isActive must be true or false')],
  validate,
  controller.setSellerStatus
);

router.get('/sellers/:id', controller.getSeller);
router.get('/sellers/:id/products', controller.getSellerProducts);
router.get('/sellers/:id/orders', controller.getSellerOrders);

/* Inventory across every seller */
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

/* Catalogue attributes in use across every product */
router.get('/attributes', controller.getAttributes);

module.exports = router;
