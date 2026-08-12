const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/cartController');

const router = express.Router();

// The cart is a customer-only feature.
router.use(protect, restrictTo('customer'));

router.get('/', controller.getCart);

router.post(
  '/items',
  [
    body('productId').isInt({ gt: 0 }).withMessage('A valid product is required'),
    body('variantId').optional({ values: 'null' }).isInt({ gt: 0 }).withMessage('Invalid variant'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  controller.addToCart
);

router.post(
  '/coupon',
  [body('code').trim().notEmpty().withMessage('Enter a coupon code')],
  validate,
  controller.applyCoupon
);

router.post(
  '/move-from-wishlist',
  [body('productId').isInt({ gt: 0 }).withMessage('A valid product is required')],
  validate,
  controller.moveFromWishlist
);

router.patch(
  '/items/:id',
  [body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')],
  validate,
  controller.updateCartItem
);

router.delete('/items/:id', controller.removeCartItem);
router.delete('/', controller.clearCart);

module.exports = router;
