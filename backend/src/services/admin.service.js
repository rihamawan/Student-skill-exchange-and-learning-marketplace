/**
 * src/services/admin.service.js
 * Admin table: create (user + admin row), list, get, update, remove (admin row only).
 */

const { getPool } = require('./db');

async function getAll() {
  const [rows] = await getPool().query(
    `SELECT a.AdminID, a.UniversityID, a.AdminLevel, a.CreatedAt,
            u.Email, u.FullName,
            univ.UniversityName
     FROM Admin a
     JOIN User u ON u.UserID = a.AdminID
     JOIN University univ ON univ.UniversityID = a.UniversityID
     ORDER BY a.CreatedAt DESC`
  );
  return rows;
}

async function getById(adminId) {
  const [rows] = await getPool().query(
    `SELECT a.AdminID, a.UniversityID, a.AdminLevel, a.CreatedAt,
            u.Email, u.FullName,
            univ.UniversityName
     FROM Admin a
     JOIN User u ON u.UserID = a.AdminID
     JOIN University univ ON univ.UniversityID = a.UniversityID
     WHERE a.AdminID = ?`,
    [adminId]
  );
  return rows[0] ?? null;
}

async function addAdminRole(userId, universityId, adminLevel = 'standard') {
  await getPool().query(
    'INSERT INTO Admin (AdminID, UniversityID, AdminLevel) VALUES (?, ?, ?)',
    [userId, universityId, adminLevel]
  );
  return getById(userId);
}

async function update(adminId, data) {
  const { universityId, adminLevel } = data;
  const updates = [];
  const params = [];
  if (universityId != null) {
    updates.push('UniversityID = ?');
    params.push(universityId);
  }
  if (adminLevel != null) {
    updates.push('AdminLevel = ?');
    params.push(adminLevel);
  }
  if (updates.length === 0) return getById(adminId);
  params.push(adminId);
  const [result] = await getPool().query(
    `UPDATE Admin SET ${updates.join(', ')} WHERE AdminID = ?`,
    params
  );
  if (result.affectedRows === 0) return null;
  return getById(adminId);
}

async function remove(adminId) {
  const row = await getById(adminId);
  if (!row) return null;
  await getPool().query('DELETE FROM Admin WHERE AdminID = ?', [adminId]);
  return row;
}

module.exports = { getAll, getById, addAdminRole, update, remove };
