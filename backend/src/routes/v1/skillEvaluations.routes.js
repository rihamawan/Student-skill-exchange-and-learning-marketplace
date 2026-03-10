/**
 * src/routes/v1/skillEvaluations.routes.js
 * SkillEvaluation: list (admin uni-scoped / superadmin all), get, create (admin/superadmin), update (grade/status).
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const skillEvaluationsController = require('../../controllers/skillEvaluations.controller');
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

router.get('/', requireAuth, skillEvaluationsController.list);
router.get('/:id', requireAuth, param('id').isInt({ min: 1 }).withMessage('Invalid evaluation id'), handleValidation, skillEvaluationsController.get);
router.post('/', requireAuth, requireRoles('admin', 'superadmin'), body('studentId').isInt({ min: 1 }), body('skillId').isInt({ min: 1 }), handleValidation, skillEvaluationsController.create);
router.patch('/:id', requireAuth, requireRoles('admin', 'superadmin'), param('id').isInt({ min: 1 }), body('status').optional().isIn(['pending', 'in-progress', 'submitted', 'graded']), body('score').optional().isInt({ min: 0 }), body('totalPossible').optional().isInt({ min: 0 }), handleValidation, skillEvaluationsController.update);

module.exports = router;
