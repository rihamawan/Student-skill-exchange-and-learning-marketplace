/**
 * src/routes/v1/admin.routes.js
 * University Admin only: students at my uni, verify student.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const adminController = require('../../controllers/admin.controller');
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

router.get('/students', requireAuth, requireRoles('admin'), adminController.listStudents);
router.patch(
  '/students/:id/verify',
  requireAuth,
  requireRoles('admin'),
  param('id').isInt({ min: 1 }).withMessage('Invalid student id'),
  body('verified').isBoolean().withMessage('verified must be true or false'),
  handleValidation,
  adminController.verifyStudent
);

module.exports = router;
