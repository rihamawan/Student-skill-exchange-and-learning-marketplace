/**
 * src/routes/v1/exchanges.routes.js
 * Exchange: list mine, get, patch status.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const exchangesController = require('../../controllers/exchanges.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/rbac.middleware');
const { requireStudentVerified } = require('../../middleware/requireStudentVerified.middleware');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
}

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid exchange id');

router.get(
  '/',
  requireAuth,
  requireRoles('student', 'admin', 'superadmin'),
  requireStudentVerified,
  exchangesController.list
);
router.get(
  '/:id',
  requireAuth,
  requireRoles('student', 'admin', 'superadmin'),
  requireStudentVerified,
  idParam,
  handleValidation,
  exchangesController.get
);
router.patch(
  '/:id/status',
  requireAuth,
  requireRoles('student', 'admin', 'superadmin'),
  requireStudentVerified,
  idParam,
  body('status').isIn(['pending', 'active', 'completed', 'cancelled']),
  handleValidation,
  exchangesController.updateStatus
);

module.exports = router;
