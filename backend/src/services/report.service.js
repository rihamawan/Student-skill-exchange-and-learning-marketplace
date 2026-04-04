/**
 * src/services/report.service.js
 * Dashboard/report stats from the database (no mock data).
 * Superadmin: platform-wide counts + SUM(Payment.Amount).
 * Admin: students / exchanges (either party at uni) / payments tied to exchanges where the offerer is at the uni.
 */

const { getPool } = require('./db');

async function getUniversitiesStudentCounts() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.UniversityID, u.UniversityName, COUNT(s.StudentID) AS studentCount
     FROM University u
     LEFT JOIN Student s ON s.UniversityID = u.UniversityID
     GROUP BY u.UniversityID, u.UniversityName
     ORDER BY u.UniversityName`
  );
  return rows.map((r) => ({
    universityId: r.UniversityID,
    universityName: r.UniversityName,
    studentCount: Number(r.studentCount),
  }));
}

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
  const universitiesStudentCounts = await getUniversitiesStudentCounts();
  return {
    totalUsers: users[0].total,
    totalStudents: students[0].total,
    totalExchanges: exchanges[0].total,
    totalPayments: payments[0].total,
    totalPaymentAmount: Number(payments[0].totalAmount),
    totalUniversities: universities[0].total,
    totalAdmins: admins[0].total,
    universitiesStudentCounts,
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

/**
 * Monthly payment aggregates for charts. Uses COALESCE(PaidAt, CreatedAt) for the month bucket.
 * @param {number} months - How many past months to include (from first day of range window).
 */
async function getPlatformPaymentTrend(months) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(COALESCE(p.PaidAt, p.CreatedAt), '%Y-%m') AS period,
            COALESCE(SUM(p.Amount), 0) AS totalAmount,
            COUNT(*) AS paymentCount
     FROM Payment p
     WHERE COALESCE(p.PaidAt, p.CreatedAt) >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ? MONTH)
     GROUP BY DATE_FORMAT(COALESCE(p.PaidAt, p.CreatedAt), '%Y-%m')
     ORDER BY period ASC`,
    [months]
  );
  return rows.map((r) => ({
    period: r.period,
    totalAmount: Number(r.totalAmount),
    paymentCount: Number(r.paymentCount),
  }));
}

/** Same as platform trend but only payments where the exchange offerer belongs to the university. */
async function getUniversityPaymentTrend(universityId, months) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(COALESCE(p.PaidAt, p.CreatedAt), '%Y-%m') AS period,
            COALESCE(SUM(p.Amount), 0) AS totalAmount,
            COUNT(*) AS paymentCount
     FROM Payment p
     JOIN Exchange e ON e.ExchangeID = p.ExchangeID
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     JOIN Student s ON s.StudentID = os.StudentID
     WHERE s.UniversityID = ?
       AND COALESCE(p.PaidAt, p.CreatedAt) >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ? MONTH)
     GROUP BY DATE_FORMAT(COALESCE(p.PaidAt, p.CreatedAt), '%Y-%m')
     ORDER BY period ASC`,
    [universityId, months]
  );
  return rows.map((r) => ({
    period: r.period,
    totalAmount: Number(r.totalAmount),
    paymentCount: Number(r.paymentCount),
  }));
}

/** Exchanges created per month (platform). Buckets by Exchange.CreatedAt. */
async function getPlatformExchangeTrend(months) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(e.CreatedAt, '%Y-%m') AS period,
            COUNT(*) AS exchangeCount
     FROM Exchange e
     WHERE e.CreatedAt >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ? MONTH)
     GROUP BY DATE_FORMAT(e.CreatedAt, '%Y-%m')
     ORDER BY period ASC`,
    [months]
  );
  return rows.map((r) => ({
    period: r.period,
    exchangeCount: Number(r.exchangeCount),
  }));
}

/**
 * Exchanges per month where either the offer student or request student is at the university
 * (same scope rule as total exchange count for university admin).
 */
async function getUniversityExchangeTrend(universityId, months) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(e.CreatedAt, '%Y-%m') AS period,
            COUNT(*) AS exchangeCount
     FROM Exchange e
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     JOIN Student so ON so.StudentID = os.StudentID
     LEFT JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
     LEFT JOIN Student sr ON sr.StudentID = rs.StudentID
     WHERE (so.UniversityID = ? OR sr.UniversityID = ?)
       AND e.CreatedAt >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ? MONTH)
     GROUP BY DATE_FORMAT(e.CreatedAt, '%Y-%m')
     ORDER BY period ASC`,
    [universityId, universityId, months]
  );
  return rows.map((r) => ({
    period: r.period,
    exchangeCount: Number(r.exchangeCount),
  }));
}

/**
 * Top skills by demand: offers + requests + exchanges (via offer’s skill). Platform-wide.
 * @param {number} limit - max rows (default 10)
 */
async function getPlatformTopSkills(limit) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM (
       SELECT sk.SkillID, sk.SkillName,
         (SELECT COUNT(*) FROM OfferedSkill os WHERE os.SkillID = sk.SkillID) AS offerCount,
         (SELECT COUNT(*) FROM RequestedSkill rq WHERE rq.SkillID = sk.SkillID) AS requestCount,
         (SELECT COUNT(*) FROM Exchange ex INNER JOIN OfferedSkill os2 ON os2.OfferID = ex.OfferID WHERE os2.SkillID = sk.SkillID) AS exchangeCount
       FROM Skill sk
     ) t
     WHERE t.offerCount + t.requestCount + t.exchangeCount > 0
     ORDER BY t.offerCount + t.requestCount + t.exchangeCount DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    skillId: r.SkillID,
    skillName: r.SkillName,
    offerCount: Number(r.offerCount),
    requestCount: Number(r.requestCount),
    exchangeCount: Number(r.exchangeCount),
  }));
}

/** Same metrics restricted to students at the given university. */
async function getUniversityTopSkills(universityId, limit) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM (
       SELECT sk.SkillID, sk.SkillName,
         (SELECT COUNT(*) FROM OfferedSkill os INNER JOIN Student st ON st.StudentID = os.StudentID WHERE os.SkillID = sk.SkillID AND st.UniversityID = ?) AS offerCount,
         (SELECT COUNT(*) FROM RequestedSkill rq INNER JOIN Student st ON st.StudentID = rq.StudentID WHERE rq.SkillID = sk.SkillID AND st.UniversityID = ?) AS requestCount,
         (SELECT COUNT(*) FROM Exchange ex
            INNER JOIN OfferedSkill os2 ON os2.OfferID = ex.OfferID AND os2.SkillID = sk.SkillID
            INNER JOIN Student so ON so.StudentID = os2.StudentID
            LEFT JOIN RequestedSkill rs ON rs.RequestID = ex.RequestID
            LEFT JOIN Student sr ON sr.StudentID = rs.StudentID
          WHERE so.UniversityID = ? OR sr.UniversityID = ?) AS exchangeCount
       FROM Skill sk
     ) t
     WHERE t.offerCount + t.requestCount + t.exchangeCount > 0
     ORDER BY t.offerCount + t.requestCount + t.exchangeCount DESC
     LIMIT ?`,
    [universityId, universityId, universityId, universityId, limit]
  );
  return rows.map((r) => ({
    skillId: r.SkillID,
    skillName: r.SkillName,
    offerCount: Number(r.offerCount),
    requestCount: Number(r.requestCount),
    exchangeCount: Number(r.exchangeCount),
  }));
}

/**
 * Superadmin: universities ranked by how many exchanges involve at least one student from that university.
 */
async function getUniversityExchangeLeaderboard(limit) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.UniversityID, u.UniversityName,
            COUNT(DISTINCT x.ExchangeID) AS exchangeCount
     FROM University u
     INNER JOIN (
       SELECT e.ExchangeID, so.UniversityID AS UniversityID
       FROM Exchange e
       JOIN OfferedSkill os ON os.OfferID = e.OfferID
       JOIN Student so ON so.StudentID = os.StudentID
       UNION
       SELECT e.ExchangeID, sr.UniversityID
       FROM Exchange e
       JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
       JOIN Student sr ON sr.StudentID = rs.StudentID
     ) x ON x.UniversityID = u.UniversityID
     GROUP BY u.UniversityID, u.UniversityName
     ORDER BY exchangeCount DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    universityId: r.UniversityID,
    universityName: r.UniversityName,
    exchangeCount: Number(r.exchangeCount),
  }));
}

module.exports = {
  getPlatformStats,
  getUniversityStats,
  getPlatformPaymentTrend,
  getUniversityPaymentTrend,
  getPlatformExchangeTrend,
  getUniversityExchangeTrend,
  getPlatformTopSkills,
  getUniversityTopSkills,
  getUniversityExchangeLeaderboard,
};
