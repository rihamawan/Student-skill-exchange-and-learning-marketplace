/**
 * src/services/skillCategory.service.js
 * Raw SQL for SkillCategory table.
 */

const { getPool } = require('./db');

async function getAll() {
  const [rows] = await getPool().query(
    'SELECT CategoryID, CategoryName, Description, CreatedAt FROM SkillCategory ORDER BY CategoryName'
  );
  return rows;
}

async function getById(categoryId) {
  const [rows] = await getPool().query(
    'SELECT CategoryID, CategoryName, Description, CreatedAt FROM SkillCategory WHERE CategoryID = ?',
    [categoryId]
  );
  return rows[0] ?? null;
}

async function create(categoryName, description) {
  const [result] = await getPool().query(
    'INSERT INTO SkillCategory (CategoryName, Description) VALUES (?, ?)',
    [categoryName, description ?? null]
  );
  return getById(result.insertId);
}

async function update(categoryId, data) {
  const { categoryName, description } = data;
  const updates = [];
  const params = [];
  if (categoryName != null) {
    updates.push('CategoryName = ?');
    params.push(categoryName);
  }
  if (description !== undefined) {
    updates.push('Description = ?');
    params.push(description ?? null);
  }
  if (updates.length === 0) return getById(categoryId);
  params.push(categoryId);
  const [result] = await getPool().query(
    `UPDATE SkillCategory SET ${updates.join(', ')} WHERE CategoryID = ?`,
    params
  );
  if (result.affectedRows === 0) return null;
  return getById(categoryId);
}

async function remove(categoryId) {
  const row = await getById(categoryId);
  if (!row) return null;
  await getPool().query('DELETE FROM SkillCategory WHERE CategoryID = ?', [categoryId]);
  return row;
}

module.exports = { getAll, getById, create, update, remove };
