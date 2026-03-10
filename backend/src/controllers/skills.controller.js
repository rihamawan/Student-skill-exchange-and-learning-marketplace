/**
 * src/controllers/skills.controller.js
 * Read-only Skill list and get. Optional filter by categoryId.
 */

const skillService = require('../services/skill.service');

function toApi(row) {
  if (!row) return null;
  return {
    id: row.SkillID,
    categoryId: row.CategoryID,
    categoryName: row.CategoryName,
    name: row.SkillName,
    description: row.Description,
    difficultyLevel: row.DifficultyLevel,
    createdAt: row.CreatedAt,
  };
}

async function list(req, res) {
  try {
    const categoryId = req.query.categoryId != null ? Number(req.query.categoryId) : undefined;
    const rows = await skillService.getAll({ categoryId });
    res.status(200).json({ success: true, data: rows.map(toApi) });
  } catch (err) {
    console.error('skills.list', err);
    res.status(500).json({ success: false, error: 'Failed to list skills' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await skillService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('skills.get', err);
    res.status(500).json({ success: false, error: 'Failed to get skill' });
  }
}

async function create(req, res) {
  try {
    const { categoryId, skillName, description, difficultyLevel } = req.body;
    const created = await skillService.create(categoryId, skillName, description, difficultyLevel);
    res.status(201).json({ success: true, data: toApi(created) });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ success: false, error: 'Invalid categoryId' });
    }
    console.error('skills.create', err);
    res.status(500).json({ success: false, error: 'Failed to create skill' });
  }
}

async function update(req, res) {
  try {
    const id = Number(req.params.id);
    const updated = await skillService.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }
    res.status(200).json({ success: true, data: toApi(updated) });
  } catch (err) {
    console.error('skills.update', err);
    res.status(500).json({ success: false, error: 'Failed to update skill' });
  }
}

async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    const deleted = await skillService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }
    res.status(200).json({ success: true, data: toApi(deleted) });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ success: false, error: 'Skill is in use' });
    }
    console.error('skills.remove', err);
    res.status(500).json({ success: false, error: 'Failed to delete skill' });
  }
}

module.exports = { list, get, create, update, remove };
