/**
 * src/controllers/universities.controller.js
 * University resource. Superadmin: full CRUD. Others: list + get (read-only).
 */

const universityService = require('../services/university.service');

function toApi(row) {
  if (!row) return null;
  return {
    id: row.UniversityID,
    name: row.UniversityName,
    address: row.Address,
    contactEmail: row.ContactEmail,
    createdAt: row.CreatedAt,
  };
}

async function list(req, res) {
  try {
    const rows = await universityService.getAll();
    res.status(200).json({ success: true, data: rows.map(toApi) });
  } catch (err) {
    console.error('universities.list', err);
    res.status(500).json({ success: false, error: 'Failed to list universities' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await universityService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'University not found' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('universities.get', err);
    res.status(500).json({ success: false, error: 'Failed to get university' });
  }
}

async function create(req, res) {
  try {
    const created = await universityService.create(req.body);
    res.status(201).json({ success: true, data: toApi(created) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Contact email already in use' });
    }
    console.error('universities.create', err);
    res.status(500).json({ success: false, error: 'Failed to create university' });
  }
}

async function update(req, res) {
  try {
    const id = Number(req.params.id);
    const updated = await universityService.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'University not found' });
    }
    res.status(200).json({ success: true, data: toApi(updated) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Contact email already in use' });
    }
    console.error('universities.update', err);
    res.status(500).json({ success: false, error: 'Failed to update university' });
  }
}

async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    const deleted = await universityService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'University not found' });
    }
    res.status(200).json({ success: true, data: toApi(deleted) });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ success: false, error: 'University has students or admins' });
    }
    console.error('universities.remove', err);
    res.status(500).json({ success: false, error: 'Failed to delete university' });
  }
}

module.exports = { list, get, create, update, remove };
