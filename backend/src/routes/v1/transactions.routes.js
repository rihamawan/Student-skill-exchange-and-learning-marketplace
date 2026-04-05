/**
 * src/routes/v1/transactions.routes.js
 * Transaction scenario endpoints (match-request, paid-exchange). Require auth + student role.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const transactionsController = require('../../controllers/transactions.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/rbac.middleware');
const { requireStudentVerified } = require('../../middleware/requireStudentVerified.middleware');

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

const confirmForm2Validators = [
  body('conversationId').isInt({ min: 1 }).withMessage('conversationId is required'),
  body('meetingType').isIn(['physical', 'online']).withMessage('meetingType must be physical or online'),
  body('venue').trim().notEmpty().withMessage('venue is required'),
  body('scheduledStart').notEmpty().withMessage('scheduledStart is required'),
  body('scheduledEnd').notEmpty().withMessage('scheduledEnd is required'),
  body('pairs').isArray({ min: 1 }).withMessage('pairs must be a non-empty array'),
  body('pairs.*.offerId').isInt({ min: 1 }).withMessage('Each pair needs offerId'),
  body('pairs.*.requestId').isInt({ min: 1 }).withMessage('Each pair needs requestId'),
  body('pairs.*.agreedPrice').optional().isFloat({ min: 0.01 }),
  body('videoSession.platform').optional().trim().notEmpty(),
  body('videoSession.meetingLink').optional().trim(),
  body('videoSession.meetingPassword').optional().trim(),
];

// POST /api/v1/transactions/match-request (student only)
router.post(
  '/match-request',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  matchRequestValidators,
  handleValidation,
  transactionsController.matchRequest
);

// POST /api/v1/transactions/paid-exchange (student only)
router.post(
  '/paid-exchange',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  paidExchangeValidators,
  handleValidation,
  transactionsController.paidExchange
);

// POST /api/v1/transactions/confirm-form2 (student only) — Form 2
router.post(
  '/confirm-form2',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  confirmForm2Validators,
  handleValidation,
  transactionsController.confirmForm2
);

module.exports = router;
