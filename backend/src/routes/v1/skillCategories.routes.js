/**
 * src/routes/v1/skillCategories.routes.js
 * List, get. Superadmin: create, update, delete.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const skillCategoriesController = require('../../controllers/skillCategories.controller');
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

router.get('/', requireAuth, skillCategoriesController.list);
router.get('/:id', requireAuth, param('id').isInt({ min: 1 }).withMessage('Invalid category id'), handleValidation, skillCategoriesController.get);
router.post('/', requireAuth, requireRoles('superadmin'), body('categoryName').trim().notEmpty(), handleValidation, skillCategoriesController.create);
router.put('/:id', requireAuth, requireRoles('superadmin'), param('id').isInt({ min: 1 }), handleValidation, skillCategoriesController.update);
router.delete('/:id', requireAuth, requireRoles('superadmin'), param('id').isInt({ min: 1 }), handleValidation, skillCategoriesController.remove);

module.exports = router;
