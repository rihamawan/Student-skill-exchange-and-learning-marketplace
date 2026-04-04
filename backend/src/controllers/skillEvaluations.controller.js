/**
 * src/controllers/skillEvaluations.controller.js
 * SkillEvaluation: list and get only. Admins/superadmins view results; students see only their own.
 * New evaluations are created by the skill-quiz flow, not via this controller.
 */

const skillEvaluationService = require('../services/skillEvaluation.service');
const userService = require('../services/user.service');

function getStudentId(req) {
  return req.user?.role === 'student' ? req.user.UserID : null;
}

function toApi(row) {
  if (!row) return null;
  return {
    id: row.EvaluationID,
    studentId: row.StudentID,
    skillId: row.SkillID,
    skillName: row.SkillName,
    studentName: row.StudentName,
    adminId: row.AdminID,
    startedAt: row.StartedAt,
    submittedAt: row.SubmittedAt,
    score: row.Score,
    totalPossible: row.TotalPossible,
    status: row.Status,
    createdAt: row.CreatedAt,
  };
}

async function list(req, res) {
  try {
    const role = String(req.user?.role ?? '').toLowerCase();
    const studentId = req.query.studentId != null ? Number(req.query.studentId) : null;
    const skillId = req.query.skillId != null ? Number(req.query.skillId) : null;
    const me = getStudentId(req);

    if (role === 'admin' && studentId == null && skillId == null) {
      const universityId = req.user?.adminUniversityID;
      if (universityId == null) {
        return res.status(403).json({ success: false, error: 'Admin university not set' });
      }
      const rows = await skillEvaluationService.getByUniversity(universityId);
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }
    if (role === 'superadmin' && studentId == null && skillId == null) {
      const rows = await skillEvaluationService.getAll();
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }

    if (studentId) {
      if (me !== studentId) {
        if (role !== 'admin' && role !== 'superadmin') {
          return res.status(403).json({ success: false, error: 'Can only list own evaluations' });
        }
        if (role === 'admin') {
          const inUni = await userService.isStudentAtUniversity(studentId, req.user?.adminUniversityID);
          if (!inUni) {
            return res.status(403).json({ success: false, error: 'Student not in your university' });
          }
        }
      }
      const rows = await skillEvaluationService.getByStudent(studentId);
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }
    if (skillId) {
      if (role === 'student') {
        if (me == null) {
          return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        const rows = await skillEvaluationService.getByStudent(me);
        const filtered = rows.filter((r) => Number(r.SkillID) === skillId);
        return res.status(200).json({ success: true, data: filtered.map(toApi) });
      }
      if (role === 'admin') {
        const universityId = req.user?.adminUniversityID;
        if (universityId == null) {
          return res.status(403).json({ success: false, error: 'Admin university not set' });
        }
        const rows = await skillEvaluationService.getBySkillForUniversity(skillId, universityId);
        return res.status(200).json({ success: true, data: rows.map(toApi) });
      }
      if (role === 'superadmin') {
        const rows = await skillEvaluationService.getBySkill(skillId);
        return res.status(200).json({ success: true, data: rows.map(toApi) });
      }
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    res.status(400).json({ success: false, error: 'Provide studentId or skillId' });
  } catch (err) {
    console.error('skillEvaluations.list', err);
    res.status(500).json({ success: false, error: 'Failed to list evaluations' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await skillEvaluationService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Evaluation not found' });
    }
    const me = getStudentId(req);
    const role = String(req.user?.role ?? '').toLowerCase();
    if (me !== row.StudentID) {
      if (role !== 'admin' && role !== 'superadmin') {
        return res.status(403).json({ success: false, error: 'Can only view own evaluation' });
      }
      if (role === 'admin') {
        const inUni = await userService.isStudentAtUniversity(row.StudentID, req.user?.adminUniversityID);
        if (!inUni) {
          return res.status(403).json({ success: false, error: 'Evaluation not in your university' });
        }
      }
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('skillEvaluations.get', err);
    res.status(500).json({ success: false, error: 'Failed to get evaluation' });
  }
}

module.exports = { list, get };
