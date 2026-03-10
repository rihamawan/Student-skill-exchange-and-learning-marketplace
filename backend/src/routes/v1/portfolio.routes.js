/**
 * src/routes/v1/portfolio.routes.js
 * Portfolio: list (?studentId= or mine), get, create, update, delete.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const portfolioController = require('../../controllers/portfolio.controller');
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

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid portfolio id');
const createValidators = [
  body('skillId').isInt({ min: 1 }).withMessage('skillId is required'),
  body('description').optional().trim(),
];

router.get('/', requireAuth, portfolioController.list);
router.get('/:id', requireAuth, idParam, handleValidation, portfolioController.get);
router.post('/', requireAuth, requireRoles('student'), createValidators, handleValidation, portfolioController.create);
router.put('/:id', requireAuth, requireRoles('student'), idParam, body('description').optional().trim(), handleValidation, portfolioController.update);
router.delete('/:id', requireAuth, requireRoles('student'), idParam, handleValidation, portfolioController.remove);

module.exports = router;
