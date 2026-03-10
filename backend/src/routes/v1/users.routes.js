/**
 * src/routes/v1/users.routes.js
 * User resource routes. All require auth except health/auth. Validation via express-validator.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const usersController = require('../../controllers/users.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles, requireSelfOrSuperadminOrAdminForUni } = require('../../middleware/rbac.middleware');

const router = express.Router();

// --- Validation helpers ---

/** Send 400 with first validation error if any */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0].msg;
    return res.status(400).json({ success: false, error: firstError });
  }
  next();
}

/** Shared body rules for create and update */
const nameEmailValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
];

/** Param id must be numeric */
const idParamValidator = param('id').isInt({ min: 1 }).withMessage('Invalid user id');

// --- Routes (all protected by requireAuth) ---

// GET /api/v1/users/me - current user (must be before /:id)
router.get('/me', requireAuth, usersController.me);

// GET /api/v1/users - superadmin: all users; admin: only their uni's students
router.get('/', requireAuth, requireRoles('admin', 'superadmin'), usersController.list);

// GET /api/v1/users/:id - self, or superadmin (any), or admin (only students at their uni)
router.get('/:id', requireAuth, idParamValidator, handleValidation, requireSelfOrSuperadminOrAdminForUni, usersController.getById);

// POST /api/v1/users - admin or superadmin (real signup is POST /auth/register)
router.post('/', requireAuth, requireRoles('admin', 'superadmin'), nameEmailValidators, handleValidation, usersController.create);

// PUT /api/v1/users/:id - self, or superadmin (any), or admin (only students at their uni)
router.put(
  '/:id',
  requireAuth,
  idParamValidator,
  nameEmailValidators,
  handleValidation,
  requireSelfOrSuperadminOrAdminForUni,
  usersController.update
);

// DELETE /api/v1/users/:id - superadmin (any), or admin (only students at their uni)
router.delete('/:id', requireAuth, requireRoles('admin', 'superadmin'), idParamValidator, handleValidation, requireSelfOrSuperadminOrAdminForUni, usersController.remove);

module.exports = router;
