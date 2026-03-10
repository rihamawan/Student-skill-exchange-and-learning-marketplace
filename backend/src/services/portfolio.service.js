/**
 * src/services/portfolio.service.js
 * Portfolio: CRUD per student (own items).
 */

const { getPool } = require('./db');

async function getById(portfolioId) {
  const [rows] = await getPool().query(
    `SELECT p.PortfolioID, p.StudentID, p.SkillID, p.Description, p.CreatedAt, p.UpdatedAt,
            s.SkillName, c.CategoryName
     FROM Portfolio p
     JOIN Skill s ON s.SkillID = p.SkillID
     JOIN SkillCategory c ON c.CategoryID = s.CategoryID
     WHERE p.PortfolioID = ?`,
    [portfolioId]
  );
  return rows[0] ?? null;
}

async function getByStudent(studentId) {
  const [rows] = await getPool().query(
    `SELECT p.PortfolioID, p.StudentID, p.SkillID, p.Description, p.CreatedAt, p.UpdatedAt,
            s.SkillName, c.CategoryName
     FROM Portfolio p
     JOIN Skill s ON s.SkillID = p.SkillID
     JOIN SkillCategory c ON c.CategoryID = s.CategoryID
     WHERE p.StudentID = ?
     ORDER BY p.UpdatedAt DESC`,
    [studentId]
  );
  return rows;
}

async function create(data) {
  const { studentId, skillId, description } = data;
  const [result] = await getPool().query(
    'INSERT INTO Portfolio (StudentID, SkillID, Description) VALUES (?, ?, ?)',
    [studentId, skillId, description ?? null]
  );
  return getById(result.insertId);
}

async function update(portfolioId, data) {
  const { description } = data;
  const [result] = await getPool().query(
    'UPDATE Portfolio SET Description = ? WHERE PortfolioID = ?',
    [description ?? null, portfolioId]
  );
  if (result.affectedRows === 0) return null;
  return getById(portfolioId);
}

async function remove(portfolioId) {
  const row = await getById(portfolioId);
  if (!row) return null;
  await getPool().query('DELETE FROM Portfolio WHERE PortfolioID = ?', [portfolioId]);
  return row;
}

async function isOwnedBy(portfolioId, studentId) {
  const [rows] = await getPool().query(
    'SELECT 1 FROM Portfolio WHERE PortfolioID = ? AND StudentID = ?',
    [portfolioId, studentId]
  );
  return rows.length > 0;
}

module.exports = { getById, getByStudent, create, update, remove, isOwnedBy };
