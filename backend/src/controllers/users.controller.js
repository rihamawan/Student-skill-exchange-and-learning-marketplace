/**
 * src/controllers/users.controller.js
 * Thin controller: calls user.service (DB) and returns consistent JSON.
 * API shape: { id, name, email } (id = UserID, name = FullName).
 */

const userService = require('../services/user.service');

/** Placeholder hash when creating via POST /users (no password in body). */
const PLACEHOLDER_PASSWORD_HASH = '$2b$10$placeholder.from.users.api';

/** Map DB row to API response shape */
function toApiUser(row) {
  if (!row) return null;
  return { id: row.UserID, name: row.FullName, email: row.Email };
}

/**
 * GET /api/v1/users/me - current user (requires auth)
 */
function me(req, res) {
  res.status(200).json({ success: true, data: toApiUser(req.user) });
}

/**
 * GET /api/v1/users - list users. Superadmin: all users. Admin: only students at their university.
 */
async function list(req, res) {
  try {
    const role = String(req.user?.role ?? '').toLowerCase();
    if (role === 'superadmin') {
      const rows = await userService.getAllUsers();
      return res.status(200).json({ success: true, data: rows.map((r) => toApiUser(r)) });
    }
    if (role === 'admin') {
      const universityId = req.user.adminUniversityID;
      if (universityId == null) {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' });
      }
      const rows = await userService.getUsersByUniversity(universityId);
      return res.status(200).json({ success: true, data: rows.map((r) => toApiUser(r)) });
    }
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  } catch (err) {
    console.error('users.list', err);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
}

/**
 * GET /api/v1/users/:id - get one user by id
 */
async function getById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: toApiUser(user) });
  } catch (err) {
    console.error('users.getById', err);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
}

/**
 * POST /api/v1/users - create user (body validated in route)
 */
async function create(req, res) {
  try {
    const { name, email } = req.body;
    const created = await userService.createUser({
      email,
      passwordHash: PLACEHOLDER_PASSWORD_HASH,
      fullName: name,
      phoneNumber: null,
    });
    res.status(201).json({ success: true, data: toApiUser(created) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }
    console.error('users.create', err);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
}

/**
 * PUT /api/v1/users/:id - update user (params and body validated in route)
 */
async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email } = req.body;
    const updated = await userService.updateUser(id, {
      fullName: name,
      email,
      phoneNumber: null,
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: toApiUser(updated) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }
    console.error('users.update', err);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
}

/**
 * DELETE /api/v1/users/:id - delete user
 */
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await userService.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: toApiUser(deleted) });
  } catch (err) {
    console.error('users.remove', err);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
}

module.exports = {
  me,
  list,
  getById,
  create,
  update,
  remove,
};
