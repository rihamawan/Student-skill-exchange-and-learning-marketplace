/**
 * Student verification helpers.
 */

const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/rbac.middleware');
const { getPool } = require('../../services/db');

const router = express.Router();

router.get('/me/verification', requireAuth, requireRoles('student'), async (req, res) => {
  try {
    const studentId = req.user?.UserID ?? req.user?.userId ?? req.user?.id;
    const n = Number(studentId);
    if (!Number.isFinite(n) || n < 1) {
      return res.status(403).json({ success: false, error: 'Invalid student account' });
    }
    const [rows] = await getPool().query('SELECT IsAdminVerified FROM Student WHERE StudentID = ?', [n]);
    const isAdminVerified = Boolean(Number(rows[0]?.IsAdminVerified ?? 0));
    res.status(200).json({
      success: true,
      data: { isAdminVerified, verified: isAdminVerified },
    });
  } catch (err) {
    console.error('students.me.verification', err);
    res.status(500).json({ success: false, error: 'Failed to load verification' });
  }
});

module.exports = router;

