/**
 * src/controllers/reviews.controller.js
 * Review: create (student), list by exchange or by reviewee.
 */

const reviewService = require('../services/review.service');
const exchangeService = require('../services/exchange.service');
const userService = require('../services/user.service');

function getStudentId(req) {
  return req.user?.role === 'student' ? req.user.UserID : null;
}

function toApi(row) {
  if (!row) return null;
  return {
    id: row.ReviewID,
    exchangeId: row.ExchangeID,
    sessionId: row.SessionID,
    reviewerId: row.ReviewerID,
    revieweeId: row.RevieweeID,
    reviewerName: row.ReviewerName,
    revieweeName: row.RevieweeName,
    rating: row.Rating,
    feedback: row.Feedback,
    createdAt: row.CreatedAt,
  };
}

async function create(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can create reviews' });
    }
    const { exchangeId, sessionId, revieweeId, rating, feedback } = req.body;
    const created = await reviewService.create({
      exchangeId: exchangeId ?? null,
      sessionId: sessionId ?? null,
      reviewerId: studentId,
      revieweeId,
      rating,
      feedback: feedback ?? null,
    });
    res.status(201).json({ success: true, data: toApi(created) });
  } catch (err) {
    if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.message?.includes('CHECK')) {
      return res.status(400).json({ success: false, error: 'Rating must be 1-5; reviewer and reviewee must differ' });
    }
    console.error('reviews.create', err);
    res.status(500).json({ success: false, error: 'Failed to create review' });
  }
}

async function list(req, res) {
  try {
    const role = String(req.user?.role ?? '').toLowerCase();
    const exchangeId = req.query.exchangeId != null ? Number(req.query.exchangeId) : null;
    const revieweeId = req.query.revieweeId != null ? Number(req.query.revieweeId) : null;

    if (role === 'admin' && exchangeId == null && revieweeId == null) {
      const universityId = req.user?.adminUniversityID;
      if (universityId == null) {
        return res.status(403).json({ success: false, error: 'Admin university not set' });
      }
      const rows = await reviewService.getByUniversity(universityId);
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }

    if (exchangeId) {
      const studentId = getStudentId(req);
      if (studentId) {
        const allowed = await exchangeService.isParticipant(exchangeId, studentId);
        if (!allowed) {
          return res.status(403).json({ success: false, error: 'Not a participant' });
        }
      } else if (role === 'admin') {
        const allowed = await exchangeService.isExchangeInUniversity(exchangeId, req.user?.adminUniversityID);
        if (!allowed) {
          return res.status(403).json({ success: false, error: 'Exchange not in your university' });
        }
      }
      const rows = await reviewService.getByExchange(exchangeId);
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }
    if (revieweeId) {
      if (role === 'admin') {
        const inUni = await userService.isStudentAtUniversity(revieweeId, req.user?.adminUniversityID);
        if (!inUni) {
          return res.status(403).json({ success: false, error: 'Student not in your university' });
        }
      }
      const rows = await reviewService.getByReviewee(revieweeId);
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }
    res.status(400).json({ success: false, error: 'Provide exchangeId or revieweeId' });
  } catch (err) {
    console.error('reviews.list', err);
    res.status(500).json({ success: false, error: 'Failed to list reviews' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await reviewService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('reviews.get', err);
    res.status(500).json({ success: false, error: 'Failed to get review' });
  }
}

module.exports = { create, list, get };
