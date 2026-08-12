const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/wishlistController');

const router = express.Router();

router.use(protect, restrictTo('customer'));

router.get('/', controller.getWishlist);

router.post(
  '/',
  [body('productId').isInt({ gt: 0 }).withMessage('A valid product is required')],
  validate,
  controller.addToWishlist
);

router.delete('/:productId', controller.removeFromWishlist);
router.delete('/', controller.clearWishlist);

module.exports = router;
