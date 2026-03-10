/**
 * src/controllers/skillCategories.controller.js
 * Read-only SkillCategory list and get.
 */

const skillCategoryService = require('../services/skillCategory.service');

function toApi(row) {
  if (!row) return null;
  return {
    id: row.CategoryID,
    name: row.CategoryName,
    description: row.Description,
    createdAt: row.CreatedAt,
  };
}

async function list(req, res) {
  try {
    const rows = await skillCategoryService.getAll();
    res.status(200).json({ success: true, data: rows.map(toApi) });
  } catch (err) {
    console.error('skillCategories.list', err);
    res.status(500).json({ success: false, error: 'Failed to list categories' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await skillCategoryService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('skillCategories.get', err);
    res.status(500).json({ success: false, error: 'Failed to get category' });
  }
}

async function create(req, res) {
  try {
    const { categoryName, description } = req.body;
    const created = await skillCategoryService.create(categoryName, description);
    res.status(201).json({ success: true, data: toApi(created) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Category name already exists' });
    }
    console.error('skillCategories.create', err);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
}

async function update(req, res) {
  try {
    const id = Number(req.params.id);
    const updated = await skillCategoryService.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.status(200).json({ success: true, data: toApi(updated) });
  } catch (err) {
    console.error('skillCategories.update', err);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
}

async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    const deleted = await skillCategoryService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.status(200).json({ success: true, data: toApi(deleted) });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ success: false, error: 'Category has skills' });
    }
    console.error('skillCategories.remove', err);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
}

module.exports = { list, get, create, update, remove };
