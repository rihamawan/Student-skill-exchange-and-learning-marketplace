/**
 * src/routes/v1/admins.routes.js
 * SuperAdmin only: CRUD for Admin (create user+admin, list, get, update, delete admin role).
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const adminsController = require('../../controllers/admins.controller');
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
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('universityId').isInt({ min: 1 }).withMessage('universityId is required'),
  body('adminLevel').optional().isIn(['standard', 'superadmin']).withMessage('adminLevel must be standard or superadmin'),
];

router.get('/', requireAuth, requireRoles('superadmin'), adminsController.list);
router.get('/:id', requireAuth, requireRoles('superadmin'), param('id').isInt({ min: 1 }), handleValidation, adminsController.get);
router.post('/', requireAuth, requireRoles('superadmin'), createValidators, handleValidation, adminsController.create);
router.put('/:id', requireAuth, requireRoles('superadmin'), param('id').isInt({ min: 1 }), body('universityId').optional().isInt({ min: 1 }), body('adminLevel').optional().isIn(['standard', 'superadmin']), handleValidation, adminsController.update);
router.delete('/:id', requireAuth, requireRoles('superadmin'), param('id').isInt({ min: 1 }), handleValidation, adminsController.remove);

module.exports = router;
