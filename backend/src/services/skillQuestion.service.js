/**
 * src/services/skillQuestion.service.js
 * SkillQuestion: list by skill, get one (with options). QuestionOption handled inside.
 */

const { getPool } = require('./db');

async function getById(questionId) {
  const [qRows] = await getPool().query(
    `SELECT q.QuestionID, q.SkillID, q.QuestionText, q.CorrectAnswer, q.Points, q.CreatedAt,
            s.SkillName
     FROM SkillQuestion q
     JOIN Skill s ON s.SkillID = q.SkillID
     WHERE q.QuestionID = ?`,
    [questionId]
  );
  const question = qRows[0] ?? null;
  if (!question) return null;
  const [optRows] = await getPool().query(
    'SELECT QuestionID, OptionKey, OptionText, IsCorrect FROM QuestionOption WHERE QuestionID = ? ORDER BY OptionKey',
    [questionId]
  );
  question.options = optRows;
  return question;
}

async function getBySkill(skillId) {
  const [rows] = await getPool().query(
    `SELECT QuestionID, SkillID, QuestionText, CorrectAnswer, Points, CreatedAt
     FROM SkillQuestion
     WHERE SkillID = ?
     ORDER BY CreatedAt`,
    [skillId]
  );
  return rows;
}

/**
 * Create question with options. options: [{ optionKey, optionText, isCorrect }].
 */
async function create(skillId, questionText, correctAnswer, points, options = []) {
  const [result] = await getPool().query(
    'INSERT INTO SkillQuestion (SkillID, QuestionText, CorrectAnswer, Points) VALUES (?, ?, ?, ?)',
    [skillId, questionText ?? null, correctAnswer ?? null, points ?? 1]
  );
  const questionId = result.insertId;
  for (const opt of options) {
    await getPool().query(
      'INSERT INTO QuestionOption (QuestionID, OptionKey, OptionText, IsCorrect) VALUES (?, ?, ?, ?)',
      [questionId, opt.optionKey, opt.optionText, opt.isCorrect ? 1 : 0]
    );
  }
  return getById(questionId);
}

async function update(questionId, data) {
  const { questionText, correctAnswer, points } = data;
  const [result] = await getPool().query(
    'UPDATE SkillQuestion SET QuestionText = COALESCE(?, QuestionText), CorrectAnswer = COALESCE(?, CorrectAnswer), Points = COALESCE(?, Points) WHERE QuestionID = ?',
    [questionText ?? null, correctAnswer ?? null, points ?? null, questionId]
  );
  if (result.affectedRows === 0) return null;
  if (data.options && Array.isArray(data.options)) {
    await getPool().query('DELETE FROM QuestionOption WHERE QuestionID = ?', [questionId]);
    for (const opt of data.options) {
      await getPool().query(
        'INSERT INTO QuestionOption (QuestionID, OptionKey, OptionText, IsCorrect) VALUES (?, ?, ?, ?)',
        [questionId, opt.optionKey, opt.optionText, opt.isCorrect ? 1 : 0]
      );
    }
  }
  return getById(questionId);
}

async function remove(questionId) {
  const row = await getById(questionId);
  if (!row) return null;
  await getPool().query('DELETE FROM SkillQuestion WHERE QuestionID = ?', [questionId]);
  return row;
}

module.exports = { getById, getBySkill, create, update, remove };
