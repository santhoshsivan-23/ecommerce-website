const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/brandController');

const router = express.Router();

router.get('/', optionalAuth, controller.listBrands);
router.get('/:id', optionalAuth, controller.getBrand);

router.post(
  '/',
  protect,
  restrictTo('admin'),
  [body('name').trim().notEmpty().withMessage('Brand name is required')],
  validate,
  controller.createBrand
);

router.patch('/:id', protect, restrictTo('admin'), controller.updateBrand);
router.delete('/:id', protect, restrictTo('admin'), controller.deleteBrand);

module.exports = router;
