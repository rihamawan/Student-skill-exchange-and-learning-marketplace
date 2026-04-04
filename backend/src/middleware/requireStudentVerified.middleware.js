/**
 * Middleware: block student actions until admin verifies Student.IsAdminVerified = 1.
 *
 * For non-student roles, it does nothing.
 */

const { getPool } = require('../services/db');

async function requireStudentVerified(req, res, next) {
  try {
    const role = String(req.user?.role ?? '').toLowerCase();
    if (role !== 'student') return next();

    const studentId = req.user?.UserID ?? req.user?.userId ?? req.user?.id;
    const n = Number(studentId);
    if (!Number.isFinite(n) || n < 1) {
      return res.status(403).json({ success: false, error: 'Invalid student account' });
    }

    const [rows] = await getPool().query('SELECT IsAdminVerified FROM Student WHERE StudentID = ?', [n]);
    const isVerified = Boolean(Number(rows[0]?.IsAdminVerified ?? 0));

    if (!isVerified) {
      return res.status(403).json({ success: false, error: 'Account pending verification' });
    }
    return next();
  } catch (err) {
    console.error('requireStudentVerified', err);
    return res.status(500).json({ success: false, error: 'Verification check failed' });
  }
}

module.exports = { requireStudentVerified };

