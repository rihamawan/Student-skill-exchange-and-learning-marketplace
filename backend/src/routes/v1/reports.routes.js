/**
 * src/routes/v1/reports.routes.js
 * GET /reports - dashboard stats (superadmin: platform, admin: university).
 */

const express = require('express');
const reportsController = require('../../controllers/reports.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.get('/payment-trend', requireAuth, requireRoles('admin', 'superadmin'), reportsController.getPaymentTrend);
router.get('/exchange-trend', requireAuth, requireRoles('admin', 'superadmin'), reportsController.getExchangeTrend);
router.get('/top-skills', requireAuth, requireRoles('admin', 'superadmin'), reportsController.getTopSkills);
router.get('/university-leaderboard', requireAuth, requireRoles('superadmin'), reportsController.getUniversityLeaderboard);
router.get('/', requireAuth, requireRoles('admin', 'superadmin'), reportsController.get);

module.exports = router;
