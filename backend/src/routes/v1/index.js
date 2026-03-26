/**
 * src/routes/v1/index.js
 * All API v1 routes. Mounted at /api/v1 in app.js.
 */

const express = require('express');
const usersRoutes = require('./users.routes');
const transactionsRoutes = require('./transactions.routes');
const authRoutes = require('./auth.routes');
const universitiesRoutes = require('./universities.routes');
const skillCategoriesRoutes = require('./skillCategories.routes');
const skillsRoutes = require('./skills.routes');
const offeredSkillsRoutes = require('./offeredSkills.routes');
const requestedSkillsRoutes = require('./requestedSkills.routes');
const conversationsRoutes = require('./conversations.routes');
const exchangesRoutes = require('./exchanges.routes');
const sessionsRoutes = require('./sessions.routes');
const reviewsRoutes = require('./reviews.routes');
const portfolioRoutes = require('./portfolio.routes');
const paymentsRoutes = require('./payments.routes');
const skillQuestionsRoutes = require('./skillQuestions.routes');
const skillEvaluationsRoutes = require('./skillEvaluations.routes');
const adminRoutes = require('./admin.routes');
const adminsRoutes = require('./admins.routes');
const reportsRoutes = require('./reports.routes');
const matchingRoutes = require('./matching.routes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API v1 healthy' });
});

// Auth: /api/v1/auth (login, register)
router.use('/auth', authRoutes);

// Admin: /api/v1/admin (university admin: students, verify)
router.use('/admin', adminRoutes);

// SuperAdmin: /api/v1/admins (CRUD admin users), /api/v1/reports (dashboard)
router.use('/admins', adminsRoutes);
router.use('/reports', reportsRoutes);

// Users resource: /api/v1/users
router.use('/users', usersRoutes);

// Transaction scenarios (Phase 2): /api/v1/transactions
router.use('/transactions', transactionsRoutes);

// Universities: /api/v1/universities (superadmin CRUD; others read)
router.use('/universities', universitiesRoutes);

// Skill categories & skills (read-only)
router.use('/skill-categories', skillCategoriesRoutes);
router.use('/skills', skillsRoutes);

// Offered / requested skills (student CRUD)
router.use('/offered-skills', offeredSkillsRoutes);
router.use('/requested-skills', requestedSkillsRoutes);

// Match forms (Form 1 / Form 2 helpers)
router.use('/matching', matchingRoutes);

// Conversations & messages
router.use('/conversations', conversationsRoutes);

// Exchanges & sessions
router.use('/exchanges', exchangesRoutes);
router.use('/sessions', sessionsRoutes);

// Reviews, portfolio, payments
router.use('/reviews', reviewsRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/payments', paymentsRoutes);

// Skill questions & evaluations (read-only API)
router.use('/skill-questions', skillQuestionsRoutes);
router.use('/skill-evaluations', skillEvaluationsRoutes);

module.exports = router;
