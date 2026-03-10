/**
 * src/controllers/payments.controller.js
 * Payment: list (admin/superadmin), get one. Students can get by exchange if participant.
 */

const paymentService = require('../services/payment.service');
const exchangeService = require('../services/exchange.service');

function getStudentId(req) {
  return req.user?.role === 'student' ? req.user.UserID : null;
}

function toApi(row) {
  if (!row) return null;
  return {
    id: row.PaymentID,
    exchangeId: row.ExchangeID,
    amount: row.Amount,
    paymentStatus: row.PaymentStatus,
    paymentMethod: row.PaymentMethod,
    paidAt: row.PaidAt,
    createdAt: row.CreatedAt,
    ...(row.ExchangeType && { exchangeType: row.ExchangeType }),
  };
}

async function list(req, res) {
  try {
    const role = String(req.user?.role ?? '').toLowerCase();
    if (role !== 'superadmin' && role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin or superadmin only' });
    }
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const rows =
      role === 'admin' && req.user?.adminUniversityID != null
        ? await paymentService.getByUniversity(req.user.adminUniversityID, limit)
        : await paymentService.getAll(limit);
    res.status(200).json({ success: true, data: rows.map(toApi) });
  } catch (err) {
    console.error('payments.list', err);
    res.status(500).json({ success: false, error: 'Failed to list payments' });
  }
}

async function get(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await paymentService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    const role = String(req.user?.role ?? '').toLowerCase();
    if (role !== 'superadmin' && role !== 'admin') {
      const studentId = getStudentId(req);
      if (studentId) {
        const allowed = await exchangeService.isParticipant(row.ExchangeID, studentId);
        if (!allowed) {
          return res.status(403).json({ success: false, error: 'Not a participant of this exchange' });
        }
      } else {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' });
      }
    }
    res.status(200).json({ success: true, data: toApi(row) });
  } catch (err) {
    console.error('payments.get', err);
    res.status(500).json({ success: false, error: 'Failed to get payment' });
  }
}

module.exports = { list, get };
