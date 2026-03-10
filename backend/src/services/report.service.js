/**
 * src/services/report.service.js
 * Dashboard/report stats. Superadmin: platform-wide. Admin: university-scoped.
 */

const { getPool } = require('./db');

async function getPlatformStats() {
  const pool = getPool();
  const [users] = await pool.query('SELECT COUNT(*) AS total FROM User');
  const [students] = await pool.query('SELECT COUNT(*) AS total FROM Student');
  const [exchanges] = await pool.query('SELECT COUNT(*) AS total FROM Exchange');
  const [payments] = await pool.query(
    'SELECT COUNT(*) AS total, COALESCE(SUM(Amount), 0) AS totalAmount FROM Payment'
  );
  const [universities] = await pool.query('SELECT COUNT(*) AS total FROM University');
  const [admins] = await pool.query('SELECT COUNT(*) AS total FROM Admin');
  return {
    totalUsers: users[0].total,
    totalStudents: students[0].total,
    totalExchanges: exchanges[0].total,
    totalPayments: payments[0].total,
    totalPaymentAmount: Number(payments[0].totalAmount),
    totalUniversities: universities[0].total,
    totalAdmins: admins[0].total,
  };
}

async function getUniversityStats(universityId) {
  const pool = getPool();
  const [students] = await pool.query(
    'SELECT COUNT(*) AS total FROM Student WHERE UniversityID = ?',
    [universityId]
  );
  const [exchanges] = await pool.query(
    `SELECT COUNT(*) AS total FROM Exchange e
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     JOIN Student so ON so.StudentID = os.StudentID
     LEFT JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
     LEFT JOIN Student sr ON sr.StudentID = rs.StudentID
     WHERE so.UniversityID = ? OR sr.UniversityID = ?`,
    [universityId, universityId]
  );
  const [payments] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(p.Amount), 0) AS totalAmount
     FROM Payment p
     JOIN Exchange e ON e.ExchangeID = p.ExchangeID
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     JOIN Student s ON s.StudentID = os.StudentID
     WHERE s.UniversityID = ?`,
    [universityId]
  );
  return {
    totalStudents: students[0].total,
    totalExchanges: exchanges[0].total,
    totalPayments: payments[0].total,
    totalPaymentAmount: Number(payments[0].totalAmount),
  };
}

module.exports = { getPlatformStats, getUniversityStats };
