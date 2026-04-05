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
      return res.status(403).json({ success: false, error: 'Only students can save profile' });
    }
    await matchingService.saveMatchForm1(studentId, req.body);
    res.status(200).json({ success: true, data: { message: 'Profile saved.' } });
  } catch (err) {
    if (err.code === 'UNIVERSITY_NOT_FOUND' || err.code === 'USER_NOT_FOUND' || err.code === 'NOT_STUDENT') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.code === 'INVALID_INPUT') {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('matching.postForm1', err);
    res.status(500).json({ success: false, error: 'Failed to save profile' });
  }
}

async function getCheck(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can check matches' });
    }
    const name = String(req.query.otherStudentName ?? '').trim();
    const idRaw = req.query.otherStudentId;
    const fromId = idRaw != null && idRaw !== '' ? Number(idRaw) : NaN;

    let other;
    let resolvedPeerName;
    if (name.length >= 2) {
      try {
        const resolved = await matchingService.resolvePeerByName(studentId, name);
        other = resolved.studentId;
        resolvedPeerName = resolved.fullName;
      } catch (err) {
        if (err.code === 'INVALID_INPUT') {
          return res.status(400).json({ success: false, error: err.message });
        }
        if (err.code === 'NOT_FOUND') {
          return res.status(404).json({ success: false, error: err.message });
        }
        if (err.code === 'AMBIGUOUS') {
          return res.status(400).json({ success: false, error: err.message });
        }
        throw err;
      }
    } else if (Number.isFinite(fromId) && fromId >= 1) {
      other = fromId;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Provide otherStudentName (at least 2 characters) or otherStudentId',
      });
    }

    const result = await matchingService.evaluateMutualMatch(studentId, other);
    const data = { ...result, otherStudentId: other };
    if (resolvedPeerName) {
      data.resolvedPeerName = resolvedPeerName;
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('matching.getCheck', err);
    res.status(500).json({ success: false, error: 'Match check failed' });
  }
}

/** All students at your university who mutually match you (complementary offers/requests + mode). */
async function getMatches(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can list matches' });
    }
    const list = await matchingService.listMutualMatchesForStudent(studentId);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    console.error('matching.getMatches', err);
    res.status(500).json({ success: false, error: 'Failed to load matches' });
  }
}

/** Mutual matches for one open requested skill (same rules as global list, scoped to that request row). */
async function getMatchesForRequest(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can list matches' });
    }
    const requestId = Number(req.params.requestId);
    if (!Number.isFinite(requestId) || requestId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid request id' });
    }
    const list = await matchingService.listMutualMatchesForRequest(studentId, requestId);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    if (err.code === 'REQUEST_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ success: false, error: err.message });
    }
    console.error('matching.getMatchesForRequest', err);
    res.status(500).json({ success: false, error: 'Failed to load matches for this request' });
  }
}

async function getForm2Eligibility(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can view eligibility' });
    }
    const conversationId = Number(req.params.conversationId);
    const bundleKey = req.query.bundleKey != null ? String(req.query.bundleKey) : undefined;
    const data = await matchingService.getForm2Eligibility(conversationId, studentId, { bundleKey });
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

async function putForm2Draft(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can save drafts' });
    }
    const conversationId = Number(req.params.conversationId);
    const conversationService = require('../services/conversation.service');
    const allowed = await conversationService.isParticipant(conversationId, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }
    const bundleKey = req.body.bundleKey != null ? String(req.body.bundleKey) : '';
    const requestId = Number(req.body.requestId);
    if (!bundleKey || !Number.isFinite(requestId) || requestId < 1) {
      return res.status(400).json({ success: false, error: 'bundleKey and requestId are required' });
    }
    await conversationService.upsertForm2SessionDraft(conversationId, bundleKey, requestId, studentId, {
      venue: req.body.venue,
      scheduledStart: req.body.scheduledStart,
      scheduledEnd: req.body.scheduledEnd,
      meetingType: req.body.meetingType,
      platform: req.body.platform,
      meetingLink: req.body.meetingLink,
      meetingPassword: req.body.meetingPassword,
      agreedPrice: req.body.agreedPrice,
    });
    res.status(200).json({ success: true, data: { message: 'Draft saved.' } });
  } catch (err) {
    if (err.code === 'FORBIDDEN_DRAFT') {
      return res.status(403).json({ success: false, error: err.message });
    }
    console.error('matching.putForm2Draft', err);
    res.status(500).json({ success: false, error: 'Failed to save draft' });
  }
}

module.exports = { postForm1, getCheck, getMatches, getMatchesForRequest, getForm2Eligibility, putForm2Draft };
