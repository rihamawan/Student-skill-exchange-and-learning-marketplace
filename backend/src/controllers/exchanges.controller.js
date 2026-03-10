/**
 * src/controllers/exchanges.controller.js
 * Exchange: list mine, get one, patch status.
 */

const exchangeService = require('../services/exchange.service');

function getStudentId(req) {
  return req.user?.role === 'student' ? req.user.UserID : null;
}

function toApi(row) {
  if (!row) return null;
  return {
    id: row.ExchangeID,
    offerId: row.OfferID,
    requestId: row.RequestID,
    conversationId: row.ConversationID,
    exchangeType: row.ExchangeType,
    status: row.Status,
    skillName: row.SkillName,
    offererName: row.OffererName,
    requesterName: row.RequesterName,
    createdAt: row.CreatedAt,
  };
}

async function list(req, res) {
  try {
    const role = String(req.user?.role ?? '').toLowerCase();
    const studentId = getStudentId(req);
    if (studentId) {
      const rows = await exchangeService.getByStudent(studentId);
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }
    if (role === 'admin') {
      const universityId = req.user?.adminUniversityID;
      if (universityId == null) {
        return res.status(403).json({ success: false, error: 'Admin university not set' });
      }
      const rows = await exchangeService.getByUniversity(universityId);
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }
    if (role === 'superadmin') {
      const rows = await exchangeService.getAll();
      return res.status(200).json({ success: true, data: rows.map(toApi) });
    }
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  } catch (err) {
    console.error('exchanges.list', err);
    res.status(500).json({ success: false, error: 'Failed to list exchanges' });
  }
}

async function get(req, res) {
  try {
    const role = String(req.user?.role ?? '').toLowerCase();
    const id = Number(req.params.id);
    const row = await exchangeService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Exchange not found' });
    }
    const studentId = getStudentId(req);
    let allowed = false;
    if (studentId && (await exchangeService.isParticipant(id, studentId))) {
      allowed = true;
    } else if (role === 'superadmin') {
      allowed = true;
    } else if (role === 'admin') {
      allowed = await exchangeService.isExchangeInUniversity(id, req.user?.adminUniversityID);
    }
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not allowed to view this exchange' });
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('exchanges.get', err);
    res.status(500).json({ success: false, error: 'Failed to get exchange' });
  }
}

async function updateStatus(req, res) {
  try {
    const role = String(req.user?.role ?? '').toLowerCase();
    const id = Number(req.params.id);
    const studentId = getStudentId(req);

    let allowed = false;
    if (role === 'superadmin') {
      allowed = true;
    } else if (role === 'admin') {
      const universityId = req.user?.adminUniversityID;
      if (universityId != null) {
        allowed = await exchangeService.isExchangeInUniversity(id, universityId);
      }
    } else if (studentId) {
      allowed = await exchangeService.isParticipant(id, studentId);
    }

    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not allowed to update this exchange' });
    }
    const { status } = req.body;
    const updated = await exchangeService.updateStatus(id, status);
    if (!updated) {
      return res.status(400).json({ success: false, error: 'Invalid status or exchange not found' });
    }
    res.status(200).json({ success: true, data: toApi(updated) });
  } catch (err) {
    console.error('exchanges.updateStatus', err);
    res.status(500).json({ success: false, error: 'Failed to update exchange' });
  }
}

module.exports = { list, get, updateStatus };
