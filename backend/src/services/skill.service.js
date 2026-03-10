/**
 * src/services/skill.service.js
 * Raw SQL for Skill table.
 */

const { getPool } = require('./db');

async function getAll(filters = {}) {
  const { categoryId } = filters;
  let sql = `
    SELECT s.SkillID, s.CategoryID, s.SkillName, s.Description, s.DifficultyLevel, s.CreatedAt,
           c.CategoryName
    FROM Skill s
    JOIN SkillCategory c ON c.CategoryID = s.CategoryID
    WHERE 1=1`;
  const params = [];
  if (categoryId != null) {
    sql += ' AND s.CategoryID = ?';
    params.push(categoryId);
  }
  sql += ' ORDER BY s.SkillName';
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function getById(skillId) {
  const [rows] = await getPool().query(
    `SELECT s.SkillID, s.CategoryID, s.SkillName, s.Description, s.DifficultyLevel, s.CreatedAt,
            c.CategoryName
     FROM Skill s
     JOIN SkillCategory c ON c.CategoryID = s.CategoryID
     WHERE s.SkillID = ?`,
    [skillId]
  );
  return rows[0] ?? null;
}

async function create(categoryId, skillName, description, difficultyLevel) {
  const [result] = await getPool().query(
    'INSERT INTO Skill (CategoryID, SkillName, Description, DifficultyLevel) VALUES (?, ?, ?, ?)',
    [categoryId, skillName, description ?? null, difficultyLevel ?? 'beginner']
  );
  return getById(result.insertId);
}

async function update(skillId, data) {
  const { categoryId, skillName, description, difficultyLevel } = data;
  const updates = [];
  const params = [];
  if (categoryId != null) {
    updates.push('CategoryID = ?');
    params.push(categoryId);
  }
  if (skillName != null) {
    updates.push('SkillName = ?');
    params.push(skillName);
  }
  if (description !== undefined) {
    updates.push('Description = ?');
    params.push(description ?? null);
  }
  if (difficultyLevel != null) {
    updates.push('DifficultyLevel = ?');
    params.push(difficultyLevel);
  }
  if (updates.length === 0) return getById(skillId);
  params.push(skillId);
  const [result] = await getPool().query(
    `UPDATE Skill SET ${updates.join(', ')} WHERE SkillID = ?`,
    params
  );
  if (result.affectedRows === 0) return null;
  return getById(skillId);
}

async function remove(skillId) {
  const row = await getById(skillId);
  if (!row) return null;
  await getPool().query('DELETE FROM Skill WHERE SkillID = ?', [skillId]);
  return row;
}

module.exports = { getAll, getById, create, update, remove };
