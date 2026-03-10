/**
 * src/controllers/skillQuestions.controller.js
 * SkillQuestion: list by skill, get one (with options). Read-only for API.
 */

const skillQuestionService = require('../services/skillQuestion.service');

function toApi(row, options = []) {
  if (!row) return null;
  const out = {
    id: row.QuestionID,
    skillId: row.SkillID,
    skillName: row.SkillName,
    questionText: row.QuestionText,
    correctAnswer: row.CorrectAnswer,
    points: row.Points,
    createdAt: row.CreatedAt,
  };
  if (options && options.length) {
    out.options = options.map((o) => ({
      optionKey: o.OptionKey,
      optionText: o.OptionText,
      isCorrect: Boolean(o.IsCorrect),
    }));
  }
  return out;
}

async function list(req, res) {
  try {
    const skillId = Number(req.query.skillId);
    if (!skillId) {
      return res.status(400).json({ success: false, error: 'skillId query is required' });
    }
    const rows = await skillQuestionService.getBySkill(skillId);
    res.status(200).json({ success: true, data: rows.map((r) => toApi(r)) });
  } catch (err) {
    console.error('skillQuestions.list', err);
    res.status(500).json({ success: false, error: 'Failed to list questions' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await skillQuestionService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    const options = row.options || [];
    res.status(200).json({ success: true, data: toApi(row, options) });
  } catch (err) {
    console.error('skillQuestions.get', err);
    res.status(500).json({ success: false, error: 'Failed to get question' });
  }
}

async function create(req, res) {
  try {
    const { skillId, questionText, correctAnswer, points, options } = req.body;
    const created = await skillQuestionService.create(skillId, questionText, correctAnswer, points ?? 1, options ?? []);
    const opts = created.options || [];
    res.status(201).json({ success: true, data: toApi(created, opts) });
  } catch (err) {
    console.error('skillQuestions.create', err);
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
}

async function update(req, res) {
  try {
    const id = Number(req.params.id);
    const updated = await skillQuestionService.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    const opts = updated.options || [];
    res.status(200).json({ success: true, data: toApi(updated, opts) });
  } catch (err) {
    console.error('skillQuestions.update', err);
    res.status(500).json({ success: false, error: 'Failed to update question' });
  }
}

async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    const deleted = await skillQuestionService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    res.status(200).json({ success: true, data: toApi(deleted, deleted.options || []) });
  } catch (err) {
    console.error('skillQuestions.remove', err);
    res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
}

module.exports = { list, get, create, update, remove };
