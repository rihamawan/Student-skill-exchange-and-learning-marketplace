/**
 * src/services/review.service.js
 * Review: create, list by exchange/session/reviewee.
 */

const { getPool } = require('./db');

async function create(data) {
  const { exchangeId, sessionId, reviewerId, revieweeId, rating, feedback } = data;
  const [result] = await getPool().query(
    `INSERT INTO Review (ExchangeID, SessionID, ReviewerID, RevieweeID, Rating, Feedback)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [exchangeId ?? null, sessionId ?? null, reviewerId, revieweeId, rating, feedback ?? null]
  );
  return getById(result.insertId);
}

async function getById(reviewId) {
  const [rows] = await getPool().query(
    `SELECT r.ReviewID, r.ExchangeID, r.SessionID, r.ReviewerID, r.RevieweeID, r.Rating, r.Feedback, r.CreatedAt,
            u_rev.FullName AS ReviewerName, u_vee.FullName AS RevieweeName
     FROM Review r
     JOIN User u_rev ON u_rev.UserID = r.ReviewerID
     JOIN User u_vee ON u_vee.UserID = r.RevieweeID
     WHERE r.ReviewID = ?`,
    [reviewId]
  );
  return rows[0] ?? null;
}

async function getByReviewee(revieweeId) {
  const [rows] = await getPool().query(
    `SELECT r.ReviewID, r.ExchangeID, r.SessionID, r.ReviewerID, r.RevieweeID, r.Rating, r.Feedback, r.CreatedAt,
            u_rev.FullName AS ReviewerName
     FROM Review r
     JOIN User u_rev ON u_rev.UserID = r.ReviewerID
     WHERE r.RevieweeID = ?
     ORDER BY r.CreatedAt DESC`,
    [revieweeId]
  );
  return rows;
}

async function getByExchange(exchangeId) {
  const [rows] = await getPool().query(
    `SELECT r.ReviewID, r.ExchangeID, r.SessionID, r.ReviewerID, r.RevieweeID, r.Rating, r.Feedback, r.CreatedAt,
            u_rev.FullName AS ReviewerName, u_vee.FullName AS RevieweeName
     FROM Review r
     JOIN User u_rev ON u_rev.UserID = r.ReviewerID
     JOIN User u_vee ON u_vee.UserID = r.RevieweeID
     WHERE r.ExchangeID = ?
     ORDER BY r.CreatedAt DESC`,
    [exchangeId]
  );
  return rows;
}

/** Reviews where reviewee is a student at the given university (admin uni-scoped). */
async function getByUniversity(universityId) {
  const [rows] = await getPool().query(
    `SELECT r.ReviewID, r.ExchangeID, r.SessionID, r.ReviewerID, r.RevieweeID, r.Rating, r.Feedback, r.CreatedAt,
            u_rev.FullName AS ReviewerName, u_vee.FullName AS RevieweeName
     FROM Review r
     JOIN User u_rev ON u_rev.UserID = r.ReviewerID
     JOIN User u_vee ON u_vee.UserID = r.RevieweeID
     JOIN Student s ON s.StudentID = r.RevieweeID
     WHERE s.UniversityID = ?
     ORDER BY r.CreatedAt DESC`,
    [universityId]
  );
  return rows;
}

module.exports = { create, getById, getByReviewee, getByExchange, getByUniversity };
