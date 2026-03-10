/**
 * src/routes/v1/skills.routes.js
 * List, get. Superadmin: create, update, delete.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const skillsController = require('../../controllers/skills.controller');
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

router.get('/', requireAuth, skillsController.list);
router.get('/:id', requireAuth, param('id').isInt({ min: 1 }).withMessage('Invalid skill id'), handleValidation, skillsController.get);
router.post('/', requireAuth, requireRoles('superadmin'), body('categoryId').isInt({ min: 1 }), body('skillName').trim().notEmpty(), body('difficultyLevel').optional().isIn(['beginner', 'intermediate', 'advanced']), handleValidation, skillsController.create);
router.put('/:id', requireAuth, requireRoles('superadmin'), param('id').isInt({ min: 1 }), handleValidation, skillsController.update);
router.delete('/:id', requireAuth, requireRoles('superadmin'), param('id').isInt({ min: 1 }), handleValidation, skillsController.remove);

module.exports = router;
