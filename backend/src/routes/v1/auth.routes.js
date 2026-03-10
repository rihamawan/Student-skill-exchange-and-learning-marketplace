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

const registerValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phoneNumber').optional().trim(),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidators, handleValidation, authController.register);
router.post('/login', loginValidators, handleValidation, authController.login);

module.exports = router;
