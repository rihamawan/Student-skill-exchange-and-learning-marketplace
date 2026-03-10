/**
 * src/routes/v1/transactions.routes.js
 * Two transaction scenario endpoints (Phase 2). Require auth + student role.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const transactionsController = require('../../controllers/transactions.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/rbac.middleware');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg,
    });
  }
  next();
}

const matchRequestValidators = [
  body('offerId').isInt({ min: 1 }).withMessage('offerId must be a positive integer'),
  body('requestId').isInt({ min: 1 }).withMessage('requestId must be a positive integer'),
  body('conversationId').isInt({ min: 1 }).withMessage('conversationId must be a positive integer'),
  body('scheduledStart').notEmpty().withMessage('scheduledStart is required (e.g. 2025-03-15 10:00:00)'),
  body('scheduledEnd').notEmpty().withMessage('scheduledEnd is required'),
];

const paidExchangeValidators = [
  body('exchangeId').isInt({ min: 1 }).withMessage('exchangeId must be a positive integer'),
  body('price').isFloat({ min: 0.01 }).withMessage('price must be a positive number'),
];

// POST /api/v1/transactions/match-request (student only)
router.post(
  '/match-request',
  requireAuth,
  requireRoles('student'),
  matchRequestValidators,
  handleValidation,
  transactionsController.matchRequest
);

// POST /api/v1/transactions/paid-exchange (student only)
router.post(
  '/paid-exchange',
  requireAuth,
  requireRoles('student'),
  paidExchangeValidators,
  handleValidation,
  transactionsController.paidExchange
);

module.exports = router;
