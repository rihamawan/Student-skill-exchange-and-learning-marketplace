/**
 * src/services/skillEvaluation.service.js
 * SkillEvaluation: list by student/skill, get one. EvaluationAnswer used internally (no API).
 */

const { getPool } = require('./db');

async function getById(evaluationId) {
  const [rows] = await getPool().query(
    `SELECT e.EvaluationID, e.StudentID, e.SkillID, e.AdminID, e.StartedAt, e.SubmittedAt,
            e.Score, e.TotalPossible, e.Status, e.CreatedAt,
            s.SkillName, u.FullName AS StudentName
     FROM SkillEvaluation e
     JOIN Skill s ON s.SkillID = e.SkillID
     JOIN User u ON u.UserID = e.StudentID
     WHERE e.EvaluationID = ?`,
    [evaluationId]
  );
  return rows[0] ?? null;
}

async function getByStudent(studentId) {
  const [rows] = await getPool().query(
    `SELECT e.EvaluationID, e.StudentID, e.SkillID, e.AdminID, e.StartedAt, e.SubmittedAt,
            e.Score, e.TotalPossible, e.Status, e.CreatedAt, s.SkillName
     FROM SkillEvaluation e
     JOIN Skill s ON s.SkillID = e.SkillID
     WHERE e.StudentID = ?
     ORDER BY e.CreatedAt DESC`,
    [studentId]
  );
  return rows;
}

async function getBySkill(skillId) {
  const [rows] = await getPool().query(
    `SELECT e.EvaluationID, e.StudentID, e.SkillID, e.Status, e.Score, e.TotalPossible, e.CreatedAt,
            u.FullName AS StudentName
     FROM SkillEvaluation e
     JOIN User u ON u.UserID = e.StudentID
     WHERE e.SkillID = ?
     ORDER BY e.CreatedAt DESC`,
    [skillId]
  );
  return rows;
}

async function create(studentId, skillId, adminId = null) {
  const [result] = await getPool().query(
    'INSERT INTO SkillEvaluation (StudentID, SkillID, AdminID, Status) VALUES (?, ?, ?, ?)',
    [studentId, skillId, adminId, 'pending']
  );
  return getById(result.insertId);
}

async function update(evaluationId, data) {
  const { status, score, totalPossible, adminId } = data;
  const updates = [];
  const params = [];
  if (status != null) {
    updates.push('Status = ?');
    params.push(status);
  }
  if (score != null) {
    updates.push('Score = ?');
    params.push(score);
  }
  if (totalPossible != null) {
    updates.push('TotalPossible = ?');
    params.push(totalPossible);
  }
  if (adminId !== undefined) {
    updates.push('AdminID = ?');
    params.push(adminId);
  }
  if (status === 'graded' || status === 'submitted') {
    if (status === 'submitted') {
      updates.push('SubmittedAt = COALESCE(SubmittedAt, NOW())');
    }
    if (status === 'graded') {
      updates.push('SubmittedAt = COALESCE(SubmittedAt, NOW())');
    }
  }
  if (updates.length === 0) return getById(evaluationId);
  params.push(evaluationId);
  const [result] = await getPool().query(
    `UPDATE SkillEvaluation SET ${updates.join(', ')} WHERE EvaluationID = ?`,
    params
  );
  if (result.affectedRows === 0) return null;
  return getById(evaluationId);
}

/** All evaluations (superadmin or admin uni-scoped via controller). */
async function getAll() {
  const [rows] = await getPool().query(
    `SELECT e.EvaluationID, e.StudentID, e.SkillID, e.AdminID, e.Status, e.Score, e.TotalPossible, e.CreatedAt,
            s.SkillName, u.FullName AS StudentName
     FROM SkillEvaluation e
     JOIN Skill s ON s.SkillID = e.SkillID
     JOIN User u ON u.UserID = e.StudentID
     ORDER BY e.CreatedAt DESC`
  );
  return rows;
}

/** Evaluations for students at the given university. */
async function getByUniversity(universityId) {
  const [rows] = await getPool().query(
    `SELECT e.EvaluationID, e.StudentID, e.SkillID, e.AdminID, e.Status, e.Score, e.TotalPossible, e.CreatedAt,
            s.SkillName, u.FullName AS StudentName
     FROM SkillEvaluation e
     JOIN Skill s ON s.SkillID = e.SkillID
     JOIN User u ON u.UserID = e.StudentID
     JOIN Student st ON st.StudentID = e.StudentID
     WHERE st.UniversityID = ?
     ORDER BY e.CreatedAt DESC`,
    [universityId]
  );
  return rows;
}

module.exports = { getById, getByStudent, getBySkill, getByUniversity, getAll, create, update };
