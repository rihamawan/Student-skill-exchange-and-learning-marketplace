/**
 * Form 1 (match intake) and Form 2 eligibility endpoints.
 */

const matchingService = require('../services/matching.service');

function getStudentId(req) {
  if (String(req.user?.role ?? '').toLowerCase() !== 'student') return null;
  const id = req.user?.UserID ?? req.user?.userId ?? req.user?.id;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

async function postForm1(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can submit the match form' });
    }
    await matchingService.saveMatchForm1(studentId, req.body);
    res.status(200).json({ success: true, data: { message: 'Match profile saved.' } });
  } catch (err) {
    if (err.code === 'UNIVERSITY_NOT_FOUND' || err.code === 'USER_NOT_FOUND' || err.code === 'NOT_STUDENT') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.code === 'INVALID_INPUT') {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('matching.postForm1', err);
    res.status(500).json({ success: false, error: 'Failed to save match profile' });
  }
}

async function getCheck(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can check matches' });
    }
    const other = Number(req.query.otherStudentId);
    if (!Number.isFinite(other) || other < 1) {
      return res.status(400).json({ success: false, error: 'otherStudentId query is required' });
    }
    const result = await matchingService.evaluateMutualMatch(studentId, other);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('matching.getCheck', err);
    res.status(500).json({ success: false, error: 'Match check failed' });
  }
}

async function getForm2Eligibility(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can view eligibility' });
    }
    const conversationId = Number(req.params.conversationId);
    const data = await matchingService.getForm2Eligibility(conversationId, studentId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.code === 'CONVERSATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ success: false, error: err.message });
    }
    console.error('matching.getForm2Eligibility', err);
    res.status(500).json({ success: false, error: 'Failed to load Form 2 options' });
  }
}

module.exports = { postForm1, getCheck, getForm2Eligibility };
