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
    `SELECT e.EvaluationID, e.StudentID, e.SkillID, e.AdminID, e.Status, e.Score, e.TotalPossible, e.CreatedAt,
            s.SkillName, u.FullName AS StudentName
     FROM SkillEvaluation e
     JOIN Skill s ON s.SkillID = e.SkillID
     JOIN User u ON u.UserID = e.StudentID
     WHERE e.SkillID = ?
     ORDER BY e.CreatedAt DESC`,
    [skillId]
  );
  return rows;
}

/** Evaluations for a skill, only for students at the given university (university admin list). */
async function getBySkillForUniversity(skillId, universityId) {
  const [rows] = await getPool().query(
    `SELECT e.EvaluationID, e.StudentID, e.SkillID, e.AdminID, e.Status, e.Score, e.TotalPossible, e.CreatedAt,
            s.SkillName, u.FullName AS StudentName
     FROM SkillEvaluation e
     JOIN Skill s ON s.SkillID = e.SkillID
     JOIN User u ON u.UserID = e.StudentID
     JOIN Student st ON st.StudentID = e.StudentID
     WHERE e.SkillID = ? AND st.UniversityID = ?
     ORDER BY e.CreatedAt DESC`,
    [skillId, universityId]
  );
  return rows;
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

module.exports = { getById, getByStudent, getBySkill, getBySkillForUniversity, getByUniversity, getAll };
