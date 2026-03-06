/**
 * src/controllers/transactions.controller.js
 * Handles the two transaction scenario endpoints. Thin: calls exchange.service.
 */

const exchangeService = require('../services/exchange.service');

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
    if (err.code === 'REQUEST_NOT_OPEN') {
      return res.status(400).json({ success: false, error: err.message });
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

module.exports = { matchRequest, paidExchange };
