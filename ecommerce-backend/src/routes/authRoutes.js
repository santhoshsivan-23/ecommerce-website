const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const controller = require('../controllers/authController');

const router = express.Router();

const userRegisterValidations = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('phone').optional({ values: 'falsy' }).isMobilePhone('any').withMessage('Enter a valid phone number'),
];

const loginValidations = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Customer registration
router.post('/register', userRegisterValidations, validate, controller.register);
router.post('/customer/register', userRegisterValidations, validate, controller.register);

// Customer login
router.post('/login', loginValidations, validate, controller.login);
router.post('/customer/login', loginValidations, validate, controller.login);

// Admin dedicated authentication flow
router.post('/admin/register', userRegisterValidations, validate, controller.adminRegister);
router.post('/admin/login', loginValidations, validate, controller.adminLogin);

// Seller dedicated authentication flow
router.post('/seller/login', loginValidations, validate, controller.sellerLogin);

router.post('/logout', controller.logout);

router.get('/me', protect, controller.getMe);

router.patch(
  '/me',
  protect,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('phone').optional({ values: 'falsy' }).isMobilePhone('any').withMessage('Enter a valid phone number'),
  ],
  validate,
  controller.updateProfile
);

router.patch(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters')
      .matches(/\d/)
      .withMessage('New password must contain at least one number'),
  ],
  validate,
  controller.changePassword
);

module.exports = router;
