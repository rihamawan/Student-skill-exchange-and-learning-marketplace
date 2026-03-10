/**
 * src/routes/v1/reviews.routes.js
 * Review: create, list (?exchangeId= or ?revieweeId=), get.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const reviewsController = require('../../controllers/reviews.controller');
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

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid review id');
const createValidators = [
  body('revieweeId').isInt({ min: 1 }).withMessage('revieweeId is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be 1-5'),
  body('exchangeId').optional().isInt({ min: 1 }),
  body('sessionId').optional().isInt({ min: 1 }),
  body('feedback').optional().trim(),
];

router.post('/', requireAuth, requireRoles('student'), createValidators, handleValidation, reviewsController.create);
router.get('/', requireAuth, reviewsController.list);
router.get('/:id', requireAuth, idParam, handleValidation, reviewsController.get);

module.exports = router;
