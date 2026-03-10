/**
 * src/services/requestedSkill.service.js
 * RequestedSkill CRUD. Student owns their requests.
 */

const { getPool } = require('./db');

async function getById(requestId) {
  const [rows] = await getPool().query(
    `SELECT r.RequestID, r.StudentID, r.SkillID, r.PreferredTime, r.PreferredMode, r.Status, r.CreatedAt,
            s.SkillName, c.CategoryName
     FROM RequestedSkill r
     JOIN Skill s ON s.SkillID = r.SkillID
     JOIN SkillCategory c ON c.CategoryID = s.CategoryID
     WHERE r.RequestID = ?`,
    [requestId]
  );
  return rows[0] ?? null;
}

async function getByStudent(studentId) {
  const [rows] = await getPool().query(
    `SELECT r.RequestID, r.StudentID, r.SkillID, r.PreferredTime, r.PreferredMode, r.Status, r.CreatedAt,
            s.SkillName, c.CategoryName
     FROM RequestedSkill r
     JOIN Skill s ON s.SkillID = r.SkillID
     JOIN SkillCategory c ON c.CategoryID = s.CategoryID
     WHERE r.StudentID = ?
     ORDER BY r.CreatedAt DESC`,
    [studentId]
  );
  return rows;
}

/** List open requests (for matching). Optional skillId filter. */
async function getOpen(filters = {}) {
  const { skillId } = filters;
  let sql = `
    SELECT r.RequestID, r.StudentID, r.SkillID, r.PreferredTime, r.PreferredMode, r.Status, r.CreatedAt,
           s.SkillName, c.CategoryName, u.FullName AS StudentName
    FROM RequestedSkill r
    JOIN Skill s ON s.SkillID = r.SkillID
    JOIN SkillCategory c ON c.CategoryID = s.CategoryID
    JOIN Student st ON st.StudentID = r.StudentID
    JOIN User u ON u.UserID = st.StudentID
    WHERE r.Status = 'open'`;
  const params = [];
  if (skillId != null) {
    sql += ' AND r.SkillID = ?';
    params.push(skillId);
  }
  sql += ' ORDER BY r.CreatedAt DESC';
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function create(data) {
  const { studentId, skillId, preferredTime = 'Flexible', preferredMode = 'Exchange' } = data;
  const [result] = await getPool().query(
    'INSERT INTO RequestedSkill (StudentID, SkillID, PreferredTime, PreferredMode) VALUES (?, ?, ?, ?)',
    [studentId, skillId, preferredTime, preferredMode]
  );
  return getById(result.insertId);
}

async function updateStatus(requestId, status) {
  const allowed = ['open', 'matched', 'closed'];
  if (!allowed.includes(status)) return null;
  const [result] = await getPool().query(
    'UPDATE RequestedSkill SET Status = ? WHERE RequestID = ?',
    [status, requestId]
  );
  if (result.affectedRows === 0) return null;
  return getById(requestId);
}

async function remove(requestId) {
  const row = await getById(requestId);
  if (!row) return null;
  await getPool().query('DELETE FROM RequestedSkill WHERE RequestID = ?', [requestId]);
  return row;
}

async function isOwnedBy(requestId, studentId) {
  const [rows] = await getPool().query(
    'SELECT 1 FROM RequestedSkill WHERE RequestID = ? AND StudentID = ?',
    [requestId, studentId]
  );
  return rows.length > 0;
}

module.exports = {
  getById,
  getByStudent,
  getOpen,
  create,
  updateStatus,
  remove,
  isOwnedBy,
};
