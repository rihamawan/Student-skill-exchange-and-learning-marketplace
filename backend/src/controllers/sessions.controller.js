/**
 * src/controllers/sessions.controller.js
 * Session: list by exchangeId, get one, patch status.
 */

const sessionService = require('../services/session.service');
const exchangeService = require('../services/exchange.service');

function getStudentId(req) {
  return req.user?.role === 'student' ? req.user.UserID : null;
}

function toApi(row) {
  if (!row) return null;
  return {
    id: row.SessionID,
    exchangeId: row.ExchangeID,
    scheduledStartTime: row.ScheduledStartTime,
    scheduledEndTime: row.ScheduledEndTime,
    actualStartTime: row.ActualStartTime,
    actualEndTime: row.ActualEndTime,
    venue: row.Venue,
    status: row.Status,
    createdAt: row.CreatedAt,
  };
}

async function list(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can list sessions' });
    }
    const exchangeId = Number(req.query.exchangeId);
    if (!exchangeId) {
      return res.status(400).json({ success: false, error: 'exchangeId query is required' });
    }
    const allowed = await exchangeService.isParticipant(exchangeId, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not a participant of this exchange' });
    }
    const rows = await sessionService.getByExchange(exchangeId);
    res.status(200).json({ success: true, data: rows.map(toApi) });
  } catch (err) {
    console.error('sessions.list', err);
    res.status(500).json({ success: false, error: 'Failed to list sessions' });
  }
}

async function get(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can view sessions' });
    }
    const id = Number(req.params.id);
    const row = await sessionService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    const allowed = await exchangeService.isParticipant(row.ExchangeID, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('sessions.get', err);
    res.status(500).json({ success: false, error: 'Failed to get session' });
  }
}

async function updateStatus(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can update sessions' });
    }
    const id = Number(req.params.id);
    const row = await sessionService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    const allowed = await exchangeService.isParticipant(row.ExchangeID, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }
    const { status } = req.body;
    const updated = await sessionService.updateStatus(id, status);
    if (!updated) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    res.status(200).json({ success: true, data: toApi(updated) });
  } catch (err) {
    console.error('sessions.updateStatus', err);
    res.status(500).json({ success: false, error: 'Failed to update session' });
  }
}

module.exports = { list, get, updateStatus };
