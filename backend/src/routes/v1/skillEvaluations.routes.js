/**
 * src/routes/v1/skillEvaluations.routes.js
 * SkillEvaluation: list + get only (read-only for admins; rows are created via skill quiz).
 */

const express = require('express');
const { param, validationResult } = require('express-validator');
const skillEvaluationsController = require('../../controllers/skillEvaluations.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
}

router.get('/', requireAuth, skillEvaluationsController.list);
router.get('/:id', requireAuth, param('id').isInt({ min: 1 }).withMessage('Invalid evaluation id'), handleValidation, skillEvaluationsController.get);

module.exports = router;
