/**
 * src/services/exchange.service.js
 * Two transaction scenarios (Phase 2 requirement): raw SQL inside withTransaction.
 * BEGIN → run steps → COMMIT, or ROLLBACK on any error.
 */

const { withTransaction } = require('./transactions');

/**
 * Scenario 1: Match an open request and create Exchange + Session in one transaction.
 * If any step fails, everything rolls back.
 *
 * @param {object} params
 * @param {number} params.offerId - OfferedSkill.OfferID
 * @param {number} params.requestId - RequestedSkill.RequestID (must be open)
 * @param {number} params.conversationId - Conversation.ConversationID
 * @param {string} params.scheduledStart - DATETIME e.g. '2025-03-15 10:00:00'
 * @param {string} params.scheduledEnd - DATETIME e.g. '2025-03-15 11:00:00'
 * @param {string} [params.venue] - Venue string
 * @returns {Promise<{ exchangeId: number, sessionId: number }>}
 */
async function matchRequestCreateExchangeSession(params) {
  const {
    offerId,
    requestId,
    conversationId,
    scheduledStart,
    scheduledEnd,
    venue = 'Online',
  } = params;

  return withTransaction(async (conn) => {
    const [requestRows] = await conn.query(
      'SELECT 1 FROM RequestedSkill WHERE RequestID = ? AND Status = ?',
      [requestId, 'open']
    );
    if (!requestRows || requestRows.length === 0) {
      const err = new Error('Request not found or not open.');
      err.code = 'REQUEST_NOT_OPEN';
      throw err;
    }

    const [exResult] = await conn.query(
      `INSERT INTO Exchange (OfferID, RequestID, ConversationID, ExchangeType, Status)
       VALUES (?, ?, ?, 'Exchange', 'pending')`,
      [offerId, requestId, conversationId]
    );
    const exchangeId = exResult.insertId;

    const [sessResult] = await conn.query(
      `INSERT INTO Session (ExchangeID, ScheduledStartTime, ScheduledEndTime, Venue, Status)
       VALUES (?, ?, ?, ?, 'scheduled')`,
      [exchangeId, scheduledStart, scheduledEnd, venue]
    );
    const sessionId = sessResult.insertId;

    await conn.query(
      'UPDATE RequestedSkill SET Status = ? WHERE RequestID = ?',
      ['matched', requestId]
    );

    return { exchangeId, sessionId };
  });
}

/**
 * Scenario 2: Mark exchange as paid and create PaidExchange + Payment in one transaction.
 * Trigger trg_payment_validate requires ExchangeType = 'paid' before inserting Payment,
 * so we UPDATE Exchange first, then INSERT PaidExchange, then INSERT Payment.
 *
 * @param {object} params
 * @param {number} params.exchangeId - Exchange.ExchangeID (must exist)
 * @param {number} params.price - Positive amount
 * @param {string} [params.currency] - e.g. 'PKR'
 * @param {string} [params.paymentMethod] - e.g. 'JazCash'
 * @returns {Promise<{ success: true }>}
 */
async function createPaidExchangeWithPayment(params) {
  const {
    exchangeId,
    price,
    currency = 'PKR',
    paymentMethod = 'Cash',
  } = params;

  if (price == null || Number(price) <= 0) {
    const err = new Error('Price must be positive.');
    err.code = 'INVALID_PRICE';
    throw err;
  }

  return withTransaction(async (conn) => {
    const [exRows] = await conn.query(
      'SELECT 1 FROM Exchange WHERE ExchangeID = ?',
      [exchangeId]
    );
    if (!exRows || exRows.length === 0) {
      const err = new Error('Exchange not found.');
      err.code = 'EXCHANGE_NOT_FOUND';
      throw err;
    }

    await conn.query(
      'UPDATE Exchange SET ExchangeType = ? WHERE ExchangeID = ?',
      ['paid', exchangeId]
    );

    await conn.query(
      'INSERT INTO PaidExchange (ExchangeID, Price, Currency) VALUES (?, ?, ?)',
      [exchangeId, price, currency]
    );

    await conn.query(
      `INSERT INTO Payment (ExchangeID, Amount, PaymentStatus, PaymentMethod, PaidAt)
       VALUES (?, ?, 'completed', ?, NOW())`,
      [exchangeId, price, paymentMethod]
    );

    return { success: true };
  });
}

module.exports = {
  matchRequestCreateExchangeSession,
  createPaidExchangeWithPayment,
};
