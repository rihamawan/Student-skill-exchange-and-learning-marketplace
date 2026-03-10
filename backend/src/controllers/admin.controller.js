/**
 * src/controllers/admin.controller.js
 * University Admin only: list students at my uni, approve/reject (verify) student.
 */

const userService = require('../services/user.service');

function toApiStudent(row) {
  if (!row) return null;
  return {
    id: row.UserID,
    email: row.Email,
    fullName: row.FullName,
    isAdminVerified: Boolean(row.IsAdminVerified),
  };
}

async function listStudents(req, res) {
  try {
    const universityId = req.user?.adminUniversityID;
    if (universityId == null) {
      return res.status(403).json({ success: false, error: 'Admin university not set' });
    }
    const rows = await userService.getStudentsByUniversity(universityId);
    res.status(200).json({ success: true, data: rows.map(toApiStudent) });
  } catch (err) {
    console.error('admin.listStudents', err);
    res.status(500).json({ success: false, error: 'Failed to list students' });
  }
}

async function verifyStudent(req, res) {
  try {
    const universityId = req.user?.adminUniversityID;
    if (universityId == null) {
      return res.status(403).json({ success: false, error: 'Admin university not set' });
    }
    const studentId = Number(req.params.id);
    const allowed = await userService.isStudentAtUniversity(studentId, universityId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Student not in your university' });
    }
    const verified = req.body.verified === true;
    const updated = await userService.updateStudentVerified(studentId, verified);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    res.status(200).json({ success: true, data: { id: studentId, isAdminVerified: verified } });
  } catch (err) {
    console.error('admin.verifyStudent', err);
    res.status(500).json({ success: false, error: 'Failed to update verification' });
  }
}

module.exports = { listStudents, verifyStudent };
