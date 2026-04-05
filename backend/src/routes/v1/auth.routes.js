/**
 * src/routes/v1/auth.routes.js
 * POST /auth/register, POST /auth/login. Validation via express-validator.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../../controllers/auth.controller');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0].msg;
    return res.status(400).json({ success: false, error: firstError });
  }
  next();
}

const PK_MOBILE = /^03\d{9}$/;

const registerValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phoneNumber')
    .trim()
    .matches(PK_MOBILE)
    .withMessage('Phone must be exactly 11 digits starting with 03 (e.g. 03001234567)'),
  body('universityId').optional().isInt({ min: 1 }).withMessage('universityId must be a positive integer'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidators, handleValidation, authController.register);
router.post('/login', loginValidators, handleValidation, authController.login);

module.exports = router;
