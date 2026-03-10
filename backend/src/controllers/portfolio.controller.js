/**
 * src/controllers/portfolio.controller.js
 * Portfolio: CRUD own items. List can be own or by studentId (public profile).
 */

const portfolioService = require('../services/portfolio.service');

function getStudentId(req) {
  return req.user?.role === 'student' ? req.user.UserID : null;
}

function toApi(row) {
  if (!row) return null;
  return {
    id: row.PortfolioID,
    studentId: row.StudentID,
    skillId: row.SkillID,
    skillName: row.SkillName,
    categoryName: row.CategoryName,
    description: row.Description,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

async function list(req, res) {
  try {
    const studentId = getStudentId(req);
    const queryStudentId = req.query.studentId != null ? Number(req.query.studentId) : null;
    const targetId = queryStudentId ?? studentId;
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'Provide studentId or use authenticated student' });
    }
    const rows = await portfolioService.getByStudent(targetId);
    res.status(200).json({ success: true, data: rows.map(toApi) });
  } catch (err) {
    console.error('portfolio.list', err);
    res.status(500).json({ success: false, error: 'Failed to list portfolio' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await portfolioService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Portfolio item not found' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('portfolio.get', err);
    res.status(500).json({ success: false, error: 'Failed to get portfolio item' });
  }
}

async function create(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can add portfolio items' });
    }
    const created = await portfolioService.create({
      studentId,
      skillId: req.body.skillId,
      description: req.body.description,
    });
    res.status(201).json({ success: true, data: toApi(created) });
  } catch (err) {
    console.error('portfolio.create', err);
    res.status(500).json({ success: false, error: 'Failed to create portfolio item' });
  }
}

async function update(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can update portfolio' });
    }
    const id = Number(req.params.id);
    const allowed = await portfolioService.isOwnedBy(id, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not your portfolio item' });
    }
    const updated = await portfolioService.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Portfolio item not found' });
    }
    res.status(200).json({ success: true, data: toApi(updated) });
  } catch (err) {
    console.error('portfolio.update', err);
    res.status(500).json({ success: false, error: 'Failed to update portfolio item' });
  }
}

async function remove(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can delete portfolio items' });
    }
    const id = Number(req.params.id);
    const allowed = await portfolioService.isOwnedBy(id, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not your portfolio item' });
    }
    const deleted = await portfolioService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Portfolio item not found' });
    }
    res.status(200).json({ success: true, data: toApi(deleted) });
  } catch (err) {
    console.error('portfolio.remove', err);
    res.status(500).json({ success: false, error: 'Failed to delete portfolio item' });
  }
}

module.exports = { list, get, create, update, remove };
