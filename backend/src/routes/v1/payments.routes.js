/**
 * src/routes/v1/payments.routes.js
 * Payment: list (admin/superadmin), get one.
 */

const express = require('express');
const { param, validationResult } = require('express-validator');
const paymentsController = require('../../controllers/payments.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
}

router.get('/', requireAuth, paymentsController.list);
router.get('/:id', requireAuth, param('id').isInt({ min: 1 }).withMessage('Invalid payment id'), handleValidation, paymentsController.get);

module.exports = router;
