/**
 * src/routes/v1/conversations.routes.js
 * Conversations and nested messages. Student-only.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const conversationsController = require('../../controllers/conversations.controller');
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

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid conversation id');

router.get('/', requireAuth, requireRoles('student'), requireStudentVerified, conversationsController.list);
router.post(
  '/get-or-create',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  body('otherStudentId').isInt({ min: 1 }),
  handleValidation,
  conversationsController.getOrCreate
);
router.patch(
  '/:id/exchange-readiness',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  idParam,
  body('ready').isBoolean().withMessage('ready must be a boolean'),
  handleValidation,
  conversationsController.patchExchangeReadiness
);
router.get(
  '/:id',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  idParam,
  handleValidation,
  conversationsController.get
);
router.get(
  '/:id/messages',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  idParam,
  handleValidation,
  conversationsController.listMessages
);
router.post(
  '/:id/messages',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  idParam,
  body('content').trim().notEmpty(),
  handleValidation,
  conversationsController.sendMessage
);

module.exports = router;
