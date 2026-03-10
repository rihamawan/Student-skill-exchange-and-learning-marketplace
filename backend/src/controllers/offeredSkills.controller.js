/**
 * src/controllers/offeredSkills.controller.js
 * OfferedSkill: list (all or mine), get, create, update, delete. Student-only for create/update/delete.
 */

const offeredSkillService = require('../services/offeredSkill.service');

function getStudentId(req) {
  if (req.user?.role !== 'student') return null;
  return req.user.UserID;
}

function toApi(row) {
  if (!row) return null;
  return {
    id: row.OfferID,
    studentId: row.StudentID,
    skillId: row.SkillID,
    skillName: row.SkillName,
    categoryName: row.CategoryName,
    isPaid: Boolean(row.IsPaid),
    pricePerHour: row.PricePerHour,
    createdAt: row.CreatedAt,
    ...(row.StudentName && { studentName: row.StudentName }),
  };
}

async function list(req, res) {
  try {
    const studentId = getStudentId(req);
    const mine = req.query.mine === 'true' || req.query.mine === '1';
    const skillId = req.query.skillId != null ? Number(req.query.skillId) : undefined;

    if (mine && studentId) {
      const rows = await offeredSkillService.getByStudent(studentId);
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }
    const rows = await offeredSkillService.getAll({ skillId });
    res.status(200).json({ success: true, data: rows.map(toApi) });
  } catch (err) {
    console.error('offeredSkills.list', err);
    res.status(500).json({ success: false, error: 'Failed to list offers' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await offeredSkillService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('offeredSkills.get', err);
    res.status(500).json({ success: false, error: 'Failed to get offer' });
  }
}

async function create(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can create offers' });
    }
    const created = await offeredSkillService.create({
      studentId,
      skillId: req.body.skillId,
      isPaid: req.body.isPaid,
      pricePerHour: req.body.pricePerHour,
    });
    res.status(201).json({ success: true, data: toApi(created) });
  } catch (err) {
    console.error('offeredSkills.create', err);
    res.status(500).json({ success: false, error: 'Failed to create offer' });
  }
}

async function update(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can update offers' });
    }
    const id = Number(req.params.id);
    const allowed = await offeredSkillService.isOwnedBy(id, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not your offer' });
    }
    const updated = await offeredSkillService.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    res.status(200).json({ success: true, data: toApi(updated) });
  } catch (err) {
    console.error('offeredSkills.update', err);
    res.status(500).json({ success: false, error: 'Failed to update offer' });
  }
}

async function remove(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can delete offers' });
    }
    const id = Number(req.params.id);
    const allowed = await offeredSkillService.isOwnedBy(id, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not your offer' });
    }
    const deleted = await offeredSkillService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    res.status(200).json({ success: true, data: toApi(deleted) });
  } catch (err) {
    console.error('offeredSkills.remove', err);
    res.status(500).json({ success: false, error: 'Failed to delete offer' });
  }
}

module.exports = { list, get, create, update, remove };
