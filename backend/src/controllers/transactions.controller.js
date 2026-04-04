/**
 * src/controllers/transactions.controller.js
 * Handles the two transaction scenario endpoints. Thin: calls exchange.service.
 */

const exchangeService = require('../services/exchange.service');
const conversationService = require('../services/conversation.service');

function getStudentId(req) {
  if (String(req.user?.role ?? '').toLowerCase() !== 'student') return null;
  const id = req.user?.UserID ?? req.user?.userId ?? req.user?.id;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

/**
 * POST /api/v1/transactions/match-request
 * Body: offerId, requestId, conversationId, scheduledStart, scheduledEnd, venue?
 */
async function matchRequest(req, res) {
  try {
    const result = await exchangeService.matchRequestCreateExchangeSession(
      req.body
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.code === 'REQUEST_NOT_OPEN' || err.code === 'OFFER_NOT_FOUND' || err.code === 'CONVERSATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message });
    }
    console.error('transactions.matchRequest', err);
    res.status(500).json({ success: false, error: 'Transaction failed' });
  }
}

/**
 * POST /api/v1/transactions/paid-exchange
 * Body: exchangeId, price, currency?, paymentMethod?
 */
async function paidExchange(req, res) {
  try {
    await exchangeService.createPaidExchangeWithPayment(req.body);
    res.status(200).json({ success: true, data: { message: 'Paid exchange and payment recorded.' } });
  } catch (err) {
    if (err.code === 'INVALID_PRICE') {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.code === 'EXCHANGE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message });
    }
    console.error('transactions.paidExchange', err);
    res.status(500).json({ success: false, error: 'Transaction failed' });
  }
}

/**
 * POST /api/v1/transactions/confirm-form2
 * Form 2: create one or more exchanges + first session each (+ video / paid when applicable).
 */
async function confirmForm2(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can confirm an exchange' });
    }
    const conversationId = Number(req.body.conversationId);
    const allowed = await conversationService.isParticipant(conversationId, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not a participant in this conversation' });
    }
    const data = await exchangeService.confirmForm2ExchangeSessions(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    const clientCodes = new Set([
      'INVALID_PAIRS',
      'VIDEO_REQUIRED',
      'CONVERSATION_NOT_FOUND',
      'OFFER_NOT_FOUND',
      'REQUEST_NOT_FOUND',
      'INVALID_PAIR',
      'SKILL_MISMATCH',
      'REQUEST_NOT_OPEN',
      'MODE_MISMATCH',
      'PRICE_REQUIRED',
    ]);
    if (clientCodes.has(err.code)) {
      return res.status(400).json({ success: false, error: err.message, code: err.code });
    }
    if (err.code === 'EXCHANGE_READINESS_REQUIRED') {
      return res.status(409).json({ success: false, error: err.message, code: err.code });
    }
    console.error('transactions.confirmForm2', err);
    res.status(500).json({ success: false, error: 'Transaction failed' });
  }
}

module.exports = { matchRequest, paidExchange, confirmForm2 };
