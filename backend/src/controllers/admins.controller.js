/**
 * src/controllers/admins.controller.js
 * SuperAdmin only: CRUD for Admin records (create user+admin, list, get, update, remove admin role).
 */

const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const adminService = require('../services/admin.service');

function toApi(row) {
  if (!row) return null;
  return {
    id: row.AdminID,
    email: row.Email,
    fullName: row.FullName,
    universityId: row.UniversityID,
    universityName: row.UniversityName,
    adminLevel: row.AdminLevel,
    createdAt: row.CreatedAt,
  };
}

async function list(req, res) {
  try {
    const rows = await adminService.getAll();
    res.status(200).json({ success: true, data: rows.map(toApi) });
  } catch (err) {
    console.error('admins.list', err);
    res.status(500).json({ success: false, error: 'Failed to list admins' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await adminService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('admins.get', err);
    res.status(500).json({ success: false, error: 'Failed to get admin' });
  }
}

async function create(req, res) {
  try {
    const { email, password, fullName, universityId, adminLevel } = req.body;
    const passwordHash = await authService.hashPassword(password);
    const created = await userService.createUser({
      email,
      passwordHash,
      fullName,
      phoneNumber: null,
    });
    await adminService.addAdminRole(created.UserID, universityId, adminLevel || 'standard');
    const admin = await adminService.getById(created.UserID);
    res.status(201).json({ success: true, data: toApi(admin) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ success: false, error: 'Invalid universityId' });
    }
    console.error('admins.create', err);
    res.status(500).json({ success: false, error: 'Failed to create admin' });
  }
}

async function update(req, res) {
  try {
    const id = Number(req.params.id);
    const updated = await adminService.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    res.status(200).json({ success: true, data: toApi(updated) });
  } catch (err) {
    console.error('admins.update', err);
    res.status(500).json({ success: false, error: 'Failed to update admin' });
  }
}

async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    const deleted = await adminService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    res.status(200).json({ success: true, data: toApi(deleted) });
  } catch (err) {
    console.error('admins.remove', err);
    res.status(500).json({ success: false, error: 'Failed to remove admin' });
  }
}

module.exports = { list, get, create, update, remove };
