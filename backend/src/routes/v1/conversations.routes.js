/**
 * src/routes/v1/conversations.routes.js
 * Conversations and nested messages. Student-only.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const conversationsController = require('../../controllers/conversations.controller');
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

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid conversation id');

router.get('/', requireAuth, requireRoles('student'), conversationsController.list);
router.post('/get-or-create', requireAuth, requireRoles('student'), body('otherStudentId').isInt({ min: 1 }), handleValidation, conversationsController.getOrCreate);
router.get('/:id', requireAuth, requireRoles('student'), idParam, handleValidation, conversationsController.get);
router.get('/:id/messages', requireAuth, requireRoles('student'), idParam, handleValidation, conversationsController.listMessages);
router.post('/:id/messages', requireAuth, requireRoles('student'), idParam, body('content').trim().notEmpty(), handleValidation, conversationsController.sendMessage);

module.exports = router;
