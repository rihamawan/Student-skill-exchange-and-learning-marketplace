/**
 * src/services/user.service.js
 * Raw SQL for User table. Used by auth (Member 2) and users controller (Part 4).
 * All queries are parameterized (no SQL injection).
 */

const { getPool } = require('./db');

/**
 * Get user by email with role (student | admin | null).
 * @param {string} email
 * @returns {Promise<object|null>} User row with role, or null
 */
async function getUserByEmail(email) {
  const [rows] = await getPool().query(
    `SELECT u.UserID, u.Email, u.PasswordHash, u.FullName, u.PhoneNumber, u.CreatedAt, u.LastLogin,
            CASE WHEN a.AdminID IS NOT NULL THEN 'admin' WHEN s.StudentID IS NOT NULL THEN 'student' ELSE NULL END AS role
     FROM User u
     LEFT JOIN Admin a ON a.AdminID = u.UserID
     LEFT JOIN Student s ON s.StudentID = u.UserID
     WHERE u.Email = ?`,
    [email]
  );
  return rows[0] ?? null;
}

/**
 * Get user by id with role.
 * @param {number} userId
 * @returns {Promise<object|null>} User row with role, or null
 */
async function getUserById(userId) {
  const [rows] = await getPool().query(
    `SELECT u.UserID, u.Email, u.PasswordHash, u.FullName, u.PhoneNumber, u.CreatedAt, u.LastLogin,
            CASE WHEN a.AdminID IS NOT NULL THEN 'admin' WHEN s.StudentID IS NOT NULL THEN 'student' ELSE NULL END AS role
     FROM User u
     LEFT JOIN Admin a ON a.AdminID = u.UserID
     LEFT JOIN Student s ON s.StudentID = u.UserID
     WHERE u.UserID = ?`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Get all users (UserID, Email, FullName only — for list).
 * @returns {Promise<object[]>}
 */
async function getAllUsers() {
  const [rows] = await getPool().query(
    `SELECT UserID, Email, FullName FROM User ORDER BY UserID`
  );
  return rows;
}

/**
 * Create a new user (User table only). Caller can then add Student or Admin row if needed.
 * @param {{ email: string, passwordHash: string, fullName: string, phoneNumber?: string }} data
 * @returns {Promise<object>} Created user row (with UserID)
 */
async function createUser(data) {
  const { email, passwordHash, fullName, phoneNumber } = data;
  const [result] = await getPool().query(
    `INSERT INTO User (Email, PasswordHash, FullName, PhoneNumber)
     VALUES (?, ?, ?, ?)`,
    [email, passwordHash, fullName, phoneNumber ?? null]
  );
  const created = await getUserById(result.insertId);
  return created;
}

/**
 * Update user by id (FullName, Email, PhoneNumber).
 * @param {number} userId
 * @param {{ fullName: string, email: string, phoneNumber?: string }} data
 * @returns {Promise<object|null>} Updated user row or null if not found
 */
async function updateUser(userId, data) {
  const { fullName, email, phoneNumber } = data;
  const [result] = await getPool().query(
    `UPDATE User SET FullName = ?, Email = ?, PhoneNumber = ? WHERE UserID = ?`,
    [fullName, email, phoneNumber ?? null, userId]
  );
  if (result.affectedRows === 0) return null;
  return getUserById(userId);
}

/**
 * Delete user by id (cascades to Student/Admin via schema).
 * @param {number} userId
 * @returns {Promise<object|null>} Deleted user row or null if not found
 */
async function deleteUser(userId) {
  const user = await getUserById(userId);
  if (!user) return null;
  await getPool().query(`DELETE FROM User WHERE UserID = ?`, [userId]);
  return user;
}

module.exports = {
  getUserByEmail,
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};
