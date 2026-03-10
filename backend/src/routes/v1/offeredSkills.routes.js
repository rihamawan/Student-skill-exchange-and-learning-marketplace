/**
 * src/routes/v1/offeredSkills.routes.js
 * OfferedSkill CRUD. List: all or ?mine=true. Create/update/delete: student only.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const offeredSkillsController = require('../../controllers/offeredSkills.controller');
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

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid offer id');
const createValidators = [
  body('skillId').isInt({ min: 1 }).withMessage('skillId is required'),
  body('isPaid').optional().isBoolean().withMessage('isPaid must be boolean'),
  body('pricePerHour').optional().isFloat({ min: 0 }).withMessage('pricePerHour must be non-negative'),
];

router.get('/', requireAuth, offeredSkillsController.list);
router.get('/:id', requireAuth, idParam, handleValidation, offeredSkillsController.get);
router.post('/', requireAuth, requireRoles('student'), createValidators, handleValidation, offeredSkillsController.create);
router.put('/:id', requireAuth, requireRoles('student'), idParam, body('isPaid').optional().isBoolean(), body('pricePerHour').optional().isFloat({ min: 0 }), handleValidation, offeredSkillsController.update);
router.delete('/:id', requireAuth, requireRoles('student'), idParam, handleValidation, offeredSkillsController.remove);

module.exports = router;
