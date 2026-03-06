/**
 * src/routes/v1/index.js
 * All API v1 routes. Mounted at /api/v1 in app.js.
 */

const express = require('express');
const usersRoutes = require('./users.routes');
const transactionsRoutes = require('./transactions.routes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API v1 healthy' });
});

// Users resource: /api/v1/users
router.use('/users', usersRoutes);

// Transaction scenarios (Phase 2): /api/v1/transactions
router.use('/transactions', transactionsRoutes);

module.exports = router;
