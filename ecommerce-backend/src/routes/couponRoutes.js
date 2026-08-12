const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/couponController');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/', controller.listCoupons);

router.post(
  '/',
  [
    body('code').trim().isLength({ min: 3, max: 40 }).withMessage('Coupon code is required'),
    body('discountValue').isFloat({ gt: 0 }).withMessage('Discount value must be greater than 0'),
    body('discountType')
      .optional()
      .isIn(['percent', 'fixed'])
      .withMessage('Discount type must be percent or fixed'),
  ],
  validate,
  controller.createCoupon
);

router.patch('/:id', controller.updateCoupon);
router.delete('/:id', controller.deleteCoupon);

module.exports = router;
