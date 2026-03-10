/**
 * src/services/offeredSkill.service.js
 * OfferedSkill CRUD. Student owns their offers; list can be filtered by student or public.
 */

const { getPool } = require('./db');

async function getById(offerId) {
  const [rows] = await getPool().query(
    `SELECT o.OfferID, o.StudentID, o.SkillID, o.IsPaid, o.PricePerHour, o.CreatedAt,
            s.SkillName, c.CategoryName
     FROM OfferedSkill o
     JOIN Skill s ON s.SkillID = o.SkillID
     JOIN SkillCategory c ON c.CategoryID = s.CategoryID
     WHERE o.OfferID = ?`,
    [offerId]
  );
  return rows[0] ?? null;
}

async function getByStudent(studentId) {
  const [rows] = await getPool().query(
    `SELECT o.OfferID, o.StudentID, o.SkillID, o.IsPaid, o.PricePerHour, o.CreatedAt,
            s.SkillName, c.CategoryName
     FROM OfferedSkill o
     JOIN Skill s ON s.SkillID = o.SkillID
     JOIN SkillCategory c ON c.CategoryID = s.CategoryID
     WHERE o.StudentID = ?
     ORDER BY o.CreatedAt DESC`,
    [studentId]
  );
  return rows;
}

/** List all offers (for discovery). Optional skillId filter. */
async function getAll(filters = {}) {
  const { skillId } = filters;
  let sql = `
    SELECT o.OfferID, o.StudentID, o.SkillID, o.IsPaid, o.PricePerHour, o.CreatedAt,
           s.SkillName, c.CategoryName, u.FullName AS StudentName
    FROM OfferedSkill o
    JOIN Skill s ON s.SkillID = o.SkillID
    JOIN SkillCategory c ON c.CategoryID = s.CategoryID
    JOIN Student st ON st.StudentID = o.StudentID
    JOIN User u ON u.UserID = st.StudentID
    WHERE 1=1`;
  const params = [];
  if (skillId != null) {
    sql += ' AND o.SkillID = ?';
    params.push(skillId);
  }
  sql += ' ORDER BY o.CreatedAt DESC';
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function create(data) {
  const { studentId, skillId, isPaid = 0, pricePerHour } = data;
  const [result] = await getPool().query(
    'INSERT INTO OfferedSkill (StudentID, SkillID, IsPaid, PricePerHour) VALUES (?, ?, ?, ?)',
    [studentId, skillId, isPaid ? 1 : 0, pricePerHour ?? null]
  );
  return getById(result.insertId);
}

async function update(offerId, data) {
  const { isPaid, pricePerHour } = data;
  const [result] = await getPool().query(
    'UPDATE OfferedSkill SET IsPaid = ?, PricePerHour = ? WHERE OfferID = ?',
    [data.isPaid ? 1 : 0, data.pricePerHour ?? null, offerId]
  );
  if (result.affectedRows === 0) return null;
  return getById(offerId);
}

async function remove(offerId) {
  const row = await getById(offerId);
  if (!row) return null;
  await getPool().query('DELETE FROM OfferedSkill WHERE OfferID = ?', [offerId]);
  return row;
}

/** True if offer belongs to this student */
async function isOwnedBy(offerId, studentId) {
  const [rows] = await getPool().query(
    'SELECT 1 FROM OfferedSkill WHERE OfferID = ? AND StudentID = ?',
    [offerId, studentId]
  );
  return rows.length > 0;
}

module.exports = {
  getById,
  getByStudent,
  getAll,
  create,
  update,
  remove,
  isOwnedBy,
};
