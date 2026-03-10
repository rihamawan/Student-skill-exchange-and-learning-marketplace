/**
 * src/routes/v1/universities.routes.js
 * GET all / GET one: public (so registration can show university dropdown without login).
 * POST/PUT/DELETE: superadmin only.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const universitiesController = require('../../controllers/universities.controller');
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

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid university id');
const createValidators = [
  body('universityName').trim().notEmpty().withMessage('University name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('contactEmail').trim().isEmail().withMessage('Valid contact email is required'),
];

router.get('/', universitiesController.list);
router.get('/:id', idParam, handleValidation, universitiesController.get);
router.post('/', requireAuth, requireRoles('superadmin'), createValidators, handleValidation, universitiesController.create);
router.put('/:id', requireAuth, requireRoles('superadmin'), idParam, createValidators, handleValidation, universitiesController.update);
router.delete('/:id', requireAuth, requireRoles('superadmin'), idParam, handleValidation, universitiesController.remove);

module.exports = router;
