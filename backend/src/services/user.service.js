/**
 * src/services/user.service.js
 * Raw SQL for User table. Used by auth (Member 2) and users controller (Part 4).
 * All queries are parameterized (no SQL injection).
 */

const { getPool } = require('./db');

/**
 * Get user by email with role (student | admin | superadmin | null).
 * Superadmin = single platform-wide admin (Admin.AdminLevel = 'superadmin'). Admin = per-university (AdminLevel = 'standard').
 */
async function getUserByEmail(email) {
  const [rows] = await getPool().query(
    `SELECT u.UserID, u.Email, u.PasswordHash, u.FullName, u.PhoneNumber, u.CreatedAt, u.LastLogin,
            a.UniversityID AS adminUniversityID,
            CASE
              WHEN a.AdminID IS NOT NULL AND a.AdminLevel = 'superadmin' THEN 'superadmin'
              WHEN a.AdminID IS NOT NULL THEN 'admin'
              WHEN s.StudentID IS NOT NULL THEN 'student'
              ELSE NULL
            END AS role
     FROM User u
     LEFT JOIN Admin a ON a.AdminID = u.UserID
     LEFT JOIN Student s ON s.StudentID = u.UserID
     WHERE u.Email = ?`,
    [email]
  );
  return rows[0] ?? null;
}

/**
 * Get user by id with role (student | admin | superadmin | null).
 * Superadmin = platform-wide; admin = per-university (has adminUniversityID).
 */
async function getUserById(userId) {
  const [rows] = await getPool().query(
    `SELECT u.UserID, u.Email, u.PasswordHash, u.FullName, u.PhoneNumber, u.CreatedAt, u.LastLogin,
            a.UniversityID AS adminUniversityID,
            CASE
              WHEN a.AdminID IS NOT NULL AND a.AdminLevel = 'superadmin' THEN 'superadmin'
              WHEN a.AdminID IS NOT NULL THEN 'admin'
              WHEN s.StudentID IS NOT NULL THEN 'student'
              ELSE NULL
            END AS role
     FROM User u
     LEFT JOIN Admin a ON a.AdminID = u.UserID
     LEFT JOIN Student s ON s.StudentID = u.UserID
     WHERE u.UserID = ?`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Get all users (UserID, Email, FullName only — for list). Use for superadmin.
 * @returns {Promise<object[]>}
 */
async function getAllUsers() {
  const [rows] = await getPool().query(
    `SELECT UserID, Email, FullName FROM User ORDER BY UserID`
  );
  return rows;
}

/**
 * Get users who are students at the given university (for admin's list).
 * @param {number} universityId
 * @returns {Promise<object[]>} Same shape as getAllUsers (UserID, Email, FullName)
 */
async function getUsersByUniversity(universityId) {
  const [rows] = await getPool().query(
    `SELECT u.UserID, u.Email, u.FullName
     FROM User u
     INNER JOIN Student s ON s.StudentID = u.UserID
     WHERE s.UniversityID = ?
     ORDER BY u.UserID`,
    [universityId]
  );
  return rows;
}

/** Students at university with IsAdminVerified (for admin list). */
async function getStudentsByUniversity(universityId) {
  const [rows] = await getPool().query(
    `SELECT u.UserID, u.Email, u.FullName, s.IsAdminVerified
     FROM User u
     INNER JOIN Student s ON s.StudentID = u.UserID
     WHERE s.UniversityID = ?
     ORDER BY u.UserID`,
    [universityId]
  );
  return rows;
}

/**
 * True if userId is a student at the given university (for admin scope check).
 * @param {number} userId
 * @param {number} universityId
 * @returns {Promise<boolean>}
 */
async function isStudentAtUniversity(userId, universityId) {
  const [rows] = await getPool().query(
    `SELECT 1 FROM Student WHERE StudentID = ? AND UniversityID = ? LIMIT 1`,
    [userId, universityId]
  );
  return rows.length > 0;
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
 * Create a Student row for an existing user (so they get role 'student' and can use student-only routes).
 * @param {number} userId - UserID (will be StudentID)
 * @param {number} universityId - University.UniversityID
 * @returns {Promise<void>}
 */
async function createStudent(userId, universityId) {
  await getPool().query(
    'INSERT INTO Student (StudentID, UniversityID) VALUES (?, ?)',
    [userId, universityId]
  );
}

/**
 * Set Student.IsAdminVerified (admin approve/reject). Caller must ensure student is at their university.
 * @param {number} studentId
 * @param {boolean} verified
 * @returns {Promise<boolean>} true if updated
 */
async function updateStudentVerified(studentId, verified) {
  const [result] = await getPool().query(
    'UPDATE Student SET IsAdminVerified = ? WHERE StudentID = ?',
    [verified ? 1 : 0, studentId]
  );
  return result.affectedRows > 0;
}

/**
 * Set User.LastLogin to now (e.g. on successful login).
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function updateLastLogin(userId) {
  await getPool().query('UPDATE User SET LastLogin = NOW() WHERE UserID = ?', [userId]);
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
  getUsersByUniversity,
  getStudentsByUniversity,
  isStudentAtUniversity,
  createUser,
  createStudent,
  updateStudentVerified,
  updateLastLogin,
  updateUser,
  deleteUser,
};
