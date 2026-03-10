/**
 * src/routes/v1/requestedSkills.routes.js
 * RequestedSkill: list (all open or ?mine=true), get, create, PATCH status, delete.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const requestedSkillsController = require('../../controllers/requestedSkills.controller');
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

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid request id');
const createValidators = [
  body('skillId').isInt({ min: 1 }).withMessage('skillId is required'),
  body('preferredTime').optional().isIn(['Morning', 'Evenings', 'Weekdays', 'Weekends', 'Flexible']),
  body('preferredMode').optional().isIn(['Exchange', 'Paid']),
];

router.get('/', requireAuth, requestedSkillsController.list);
router.get('/:id', requireAuth, idParam, handleValidation, requestedSkillsController.get);
router.post('/', requireAuth, requireRoles('student'), createValidators, handleValidation, requestedSkillsController.create);
router.patch('/:id/status', requireAuth, requireRoles('student'), idParam, body('status').isIn(['open', 'matched', 'closed']), handleValidation, requestedSkillsController.updateStatus);
router.delete('/:id', requireAuth, requireRoles('student'), idParam, handleValidation, requestedSkillsController.remove);

module.exports = router;
