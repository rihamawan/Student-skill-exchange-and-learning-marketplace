/**
 * /api/v1/matching — Form 1 save, mutual match check, Form 2 eligibility.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const matchingController = require('../../controllers/matching.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/rbac.middleware');
const { requireStudentVerified } = require('../../middleware/requireStudentVerified.middleware');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
}

const preferredTimeValues = ['Morning', 'Evenings', 'Weekdays', 'Weekends', 'Flexible'];
const preferredModeValues = ['Exchange', 'Paid'];

const form1Validators = [
  body('fullName').trim().notEmpty().withMessage('fullName is required'),
  body('universityId').isInt({ min: 1 }).withMessage('universityId is required'),
  body('offered').isArray({ min: 1 }).withMessage('offered must be a non-empty array'),
  body('offered.*.skillId').isInt({ min: 1 }).withMessage('Each offered skill row must have a skill selected'),
  body('offered.*.isPaid').isBoolean().withMessage('Each offered item needs isPaid boolean'),
  body('offered.*.pricePerHour')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Paid offers need pricePerHour as a number (0 or more)'),
  body('requested').isArray({ min: 1 }).withMessage('requested must be a non-empty array'),
  body('requested.*.skillId').isInt({ min: 1 }).withMessage('Each wanted skill row must have a skill selected'),
  body('requested.*.preferredTime').isIn(preferredTimeValues).withMessage('Invalid preferredTime'),
  body('requested.*.preferredMode').isIn(preferredModeValues).withMessage('Invalid preferredMode'),
];

router.post(
  '/form1',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  form1Validators,
  handleValidation,
  matchingController.postForm1
);

router.get(
  '/check',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  query('otherStudentId').isInt({ min: 1 }).withMessage('otherStudentId is required'),
  handleValidation,
  matchingController.getCheck
);

router.get('/matches', requireAuth, requireRoles('student'), requireStudentVerified, matchingController.getMatches);

router.get(
  '/conversations/:conversationId/form2-eligibility',
  requireAuth,
  requireRoles('student'),
  requireStudentVerified,
  param('conversationId').isInt({ min: 1 }).withMessage('Invalid conversation id'),
  handleValidation,
  matchingController.getForm2Eligibility
);

module.exports = router;
