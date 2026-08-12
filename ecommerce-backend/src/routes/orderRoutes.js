const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/orderController');

const router = express.Router();

// Placing and viewing your own orders is a customer-only area.
router.use(protect, restrictTo('customer'));

// Declared before `/:idOrNumber` so it is not read as an order reference.
router.get('/checkout-summary', controller.getCheckoutSummary);

router.get('/', controller.listMyOrders);

router.post(
  '/',
  [
    body('addressId').isInt({ gt: 0 }).withMessage('Please select a delivery address'),
    body('paymentMethodId')
      .optional({ values: 'falsy' })
      .isInt({ gt: 0 })
      .withMessage('Please select a payment method'),
    body('customerNote')
      .optional({ values: 'falsy' })
      .isLength({ max: 500 })
      .withMessage('Note cannot be longer than 500 characters'),
  ],
  validate,
  controller.placeOrder
);

router.get('/:idOrNumber', controller.getMyOrder);
router.patch('/:id/cancel', controller.cancelMyOrder);

module.exports = router;
