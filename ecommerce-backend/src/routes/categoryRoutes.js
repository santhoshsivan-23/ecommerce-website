const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/categoryController');

const router = express.Router();

router.get('/', optionalAuth, controller.listCategories);
router.get('/flat', protect, restrictTo('admin'), controller.listCategoriesFlat);
router.get('/:idOrSlug', optionalAuth, controller.getCategory);

router.post(
  '/',
  protect,
  restrictTo('admin'),
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  validate,
  controller.createCategory
);

router.patch('/:id', protect, restrictTo('admin'), controller.updateCategory);
router.delete('/:id', protect, restrictTo('admin'), controller.deleteCategory);

module.exports = router;
