/**
 * src/routes/v1/reports.routes.js
 * GET /reports - dashboard stats (superadmin: platform, admin: university).
 */

const express = require('express');
const reportsController = require('../../controllers/reports.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.get('/', requireAuth, requireRoles('admin', 'superadmin'), reportsController.get);

module.exports = router;
