/**
 * src/services/university.service.js
 * Raw SQL for University table. Used by universities controller.
 */

const { getPool } = require('./db');

async function getAll() {
  const [rows] = await getPool().query(
    'SELECT UniversityID, UniversityName, Address, ContactEmail, CreatedAt FROM University ORDER BY UniversityName'
  );
  return rows;
}

async function getById(universityId) {
  const [rows] = await getPool().query(
    'SELECT UniversityID, UniversityName, Address, ContactEmail, CreatedAt FROM University WHERE UniversityID = ?',
    [universityId]
  );
  return rows[0] ?? null;
}

async function create(data) {
  const { universityName, address, contactEmail } = data;
  const [result] = await getPool().query(
    'INSERT INTO University (UniversityName, Address, ContactEmail) VALUES (?, ?, ?)',
    [universityName, address, contactEmail]
  );
  return getById(result.insertId);
}

async function update(universityId, data) {
  const { universityName, address, contactEmail } = data;
  const [result] = await getPool().query(
    'UPDATE University SET UniversityName = ?, Address = ?, ContactEmail = ? WHERE UniversityID = ?',
    [universityName, address, contactEmail, universityId]
  );
  if (result.affectedRows === 0) return null;
  return getById(universityId);
}

async function remove(universityId) {
  const row = await getById(universityId);
  if (!row) return null;
  await getPool().query('DELETE FROM University WHERE UniversityID = ?', [universityId]);
  return row;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
