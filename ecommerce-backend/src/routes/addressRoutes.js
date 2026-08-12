const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/addressController');

const router = express.Router();

router.use(protect, restrictTo('customer'));

const addressValidators = [
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('phone').trim().matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Enter a valid phone number'),
  body('addressLine1').trim().isLength({ min: 3 }).withMessage('Address line 1 is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('postalCode').trim().matches(/^[0-9A-Za-z\s-]{4,12}$/).withMessage('Enter a valid postal code'),
  body('label').optional().isIn(['home', 'work', 'other']).withMessage('Invalid address type'),
];

router.get('/', controller.listAddresses);
router.get('/:id', controller.getAddress);
router.post('/', addressValidators, validate, controller.createAddress);
router.patch('/:id', controller.updateAddress);
router.patch('/:id/default', controller.setDefaultAddress);
router.delete('/:id', controller.deleteAddress);

module.exports = router;
