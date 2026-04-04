/**
 * Skill quiz endpoints.
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/rbac.middleware');
const { requireStudentVerified } = require('../../middleware/requireStudentVerified.middleware');
const skillQuizController = require('../../controllers/skillQuiz.controller');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
}

router.get(
  '/',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  query('skillId').isInt({ min: 1 }).withMessage('skillId query is required'),
  handleValidation,
  skillQuizController.getQuiz
);

router.get(
  '/passed',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  query('skillId').isInt({ min: 1 }).withMessage('skillId query is required'),
  handleValidation,
  skillQuizController.getPassed
);

router.post(
  '/submit',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  body('skillId').isInt({ min: 1 }).withMessage('skillId is required'),
  body('answers').isArray({ min: 1 }).withMessage('answers is required'),
  body('answers.*.questionId').isInt({ min: 1 }).withMessage('questionId is required'),
  body('answers.*.selectedOptionKey').trim().notEmpty().withMessage('selectedOptionKey is required'),
  handleValidation,
  skillQuizController.submit
);

module.exports = router;

