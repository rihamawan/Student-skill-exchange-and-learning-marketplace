/**
 * src/services/session.service.js
 * Session: list by exchange, get one, update status.
 */

const { getPool } = require('./db');

async function getById(sessionId) {
  const [rows] = await getPool().query(
    `SELECT s.SessionID, s.ExchangeID, s.ScheduledStartTime, s.ScheduledEndTime,
            s.ActualStartTime, s.ActualEndTime, s.Venue, s.Status, s.CreatedAt
     FROM Session s
     WHERE s.SessionID = ?`,
    [sessionId]
  );
  return rows[0] ?? null;
}

async function getByExchange(exchangeId) {
  const [rows] = await getPool().query(
    `SELECT SessionID, ExchangeID, ScheduledStartTime, ScheduledEndTime,
            ActualStartTime, ActualEndTime, Venue, Status, CreatedAt
     FROM Session
     WHERE ExchangeID = ?
     ORDER BY ScheduledStartTime ASC`,
    [exchangeId]
  );
  return rows;
}

async function updateStatus(sessionId, status) {
  const allowed = ['scheduled', 'ongoing', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return null;
  const [result] = await getPool().query(
    'UPDATE Session SET Status = ? WHERE SessionID = ?',
    [status, sessionId]
  );
  if (result.affectedRows === 0) return null;
  return getById(sessionId);
}

module.exports = { getById, getByExchange, updateStatus };
