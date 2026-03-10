/**
 * src/routes/v1/sessions.routes.js
 * Session: list ?exchangeId=, get, patch status.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const sessionsController = require('../../controllers/sessions.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/rbac.middleware');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
}

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid session id');

router.get('/', requireAuth, requireRoles('student'), sessionsController.list);
router.get('/:id', requireAuth, requireRoles('student'), idParam, handleValidation, sessionsController.get);
router.patch('/:id/status', requireAuth, requireRoles('student'), idParam, body('status').isIn(['scheduled', 'ongoing', 'completed', 'cancelled']), handleValidation, sessionsController.updateStatus);

module.exports = router;
