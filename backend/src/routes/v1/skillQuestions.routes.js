/**
 * src/routes/v1/skillQuestions.routes.js
 * SkillQuestion: list ?skillId=, get one. Admin/superadmin: create, update, delete.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const skillQuestionsController = require('../../controllers/skillQuestions.controller');
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

const createValidators = [
  body('skillId').isInt({ min: 1 }).withMessage('skillId is required'),
  body('questionText').trim().notEmpty().withMessage('questionText is required'),
  body('correctAnswer').optional().trim(),
  body('points').optional().isInt({ min: 1 }).withMessage('points must be positive'),
  body('options').optional().isArray().withMessage('options must be array'),
];

router.get('/', requireAuth, skillQuestionsController.list);
router.get('/:id', requireAuth, param('id').isInt({ min: 1 }).withMessage('Invalid question id'), handleValidation, skillQuestionsController.get);
router.post('/', requireAuth, requireRoles('admin', 'superadmin'), createValidators, handleValidation, skillQuestionsController.create);
router.put('/:id', requireAuth, requireRoles('admin', 'superadmin'), param('id').isInt({ min: 1 }), handleValidation, skillQuestionsController.update);
router.delete('/:id', requireAuth, requireRoles('admin', 'superadmin'), param('id').isInt({ min: 1 }), handleValidation, skillQuestionsController.remove);

module.exports = router;
