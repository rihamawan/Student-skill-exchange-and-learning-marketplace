/**
 * src/controllers/requestedSkills.controller.js
 * RequestedSkill: list (mine or open), get, create, update status, delete.
 */

const requestedSkillService = require('../services/requestedSkill.service');

function getStudentId(req) {
  if (req.user?.role !== 'student') return null;
  return req.user.UserID;
}

function toApi(row) {
  if (!row) return null;
  return {
    id: row.RequestID,
    studentId: row.StudentID,
    skillId: row.SkillID,
    skillName: row.SkillName,
    categoryName: row.CategoryName,
    preferredTime: row.PreferredTime,
    preferredMode: row.PreferredMode,
    status: row.Status,
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
      const rows = await requestedSkillService.getByStudent(studentId);
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }
    const rows = await requestedSkillService.getOpen({ skillId });
    res.status(200).json({ success: true, data: rows.map(toApi) });
  } catch (err) {
    console.error('requestedSkills.list', err);
    res.status(500).json({ success: false, error: 'Failed to list requests' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await requestedSkillService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('requestedSkills.get', err);
    res.status(500).json({ success: false, error: 'Failed to get request' });
  }
}

async function create(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can create requests' });
    }
    const created = await requestedSkillService.create({
      studentId,
      skillId: req.body.skillId,
      preferredTime: req.body.preferredTime,
      preferredMode: req.body.preferredMode,
    });
    res.status(201).json({ success: true, data: toApi(created) });
  } catch (err) {
    console.error('requestedSkills.create', err);
    res.status(500).json({ success: false, error: 'Failed to create request' });
  }
}

async function updateStatus(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can update requests' });
    }
    const id = Number(req.params.id);
    const allowed = await requestedSkillService.isOwnedBy(id, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not your request' });
    }
    const { status } = req.body;
    const updated = await requestedSkillService.updateStatus(id, status);
    if (!updated) {
      return res.status(400).json({ success: false, error: 'Invalid status or request not found' });
    }
    res.status(200).json({ success: true, data: toApi(updated) });
  } catch (err) {
    console.error('requestedSkills.updateStatus', err);
    res.status(500).json({ success: false, error: 'Failed to update request' });
  }
}

async function remove(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can delete requests' });
    }
    const id = Number(req.params.id);
    const allowed = await requestedSkillService.isOwnedBy(id, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not your request' });
    }
    const deleted = await requestedSkillService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    res.status(200).json({ success: true, data: toApi(deleted) });
  } catch (err) {
    console.error('requestedSkills.remove', err);
    res.status(500).json({ success: false, error: 'Failed to delete request' });
  }
}

module.exports = { list, get, create, updateStatus, remove };
