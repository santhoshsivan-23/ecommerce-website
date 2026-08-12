const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/paymentMethodController');

const router = express.Router();

// Customers see active methods only; admins can ask for the full list.
router.get('/', optionalAuth, controller.listPaymentMethods);

router.post(
  '/',
  protect,
  restrictTo('admin'),
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Payment method name is required'),
    body('code')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^[a-zA-Z0-9_\s-]{2,40}$/)
      .withMessage('Code may only contain letters, numbers, spaces, hyphens and underscores'),
  ],
  validate,
  controller.createPaymentMethod
);

router.patch('/:id', protect, restrictTo('admin'), controller.updatePaymentMethod);
router.patch('/:id/status', protect, restrictTo('admin'), controller.togglePaymentMethod);
router.delete('/:id', protect, restrictTo('admin'), controller.deletePaymentMethod);

module.exports = router;
