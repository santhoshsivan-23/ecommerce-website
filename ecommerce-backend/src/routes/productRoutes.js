const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/productController');

const router = express.Router();

// `/filters` must be declared before `/:idOrSlug` or it would be read as a slug.
router.get('/', optionalAuth, controller.listProducts);
router.get('/filters', controller.getFilterOptions);
router.get('/:idOrSlug', optionalAuth, controller.getProduct);

const productValidators = [
  body('name').trim().isLength({ min: 2 }).withMessage('Product name is required'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('discountPrice').optional({ values: 'falsy' }).isFloat({ gt: 0 }).withMessage('Discount price must be greater than 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock cannot be negative'),
  body('categoryId').isInt({ gt: 0 }).withMessage('Please select a category'),
];

router.post(
  '/',
  protect,
  restrictTo('admin', 'seller'),
  productValidators,
  validate,
  controller.createProduct
);

router.patch('/:id', protect, restrictTo('admin', 'seller'), controller.updateProduct);
router.patch('/:id/status', protect, restrictTo('admin', 'seller'), controller.toggleProductStatus);
router.delete('/:id', protect, restrictTo('admin', 'seller'), controller.deleteProduct);

module.exports = router;
