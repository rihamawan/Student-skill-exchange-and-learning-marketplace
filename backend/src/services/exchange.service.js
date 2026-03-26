/**
 * src/services/exchange.service.js
 * Two transaction scenarios (Phase 2 requirement): raw SQL inside withTransaction.
 * Also: get by id, list by student, update status.
 */

const { getPool } = require('./db');
const { withTransaction } = require('./transactions');
const matchingService = require('./matching.service');
const conversationService = require('./conversation.service');

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
    const [offerRows] = await conn.query(
      'SELECT 1 FROM OfferedSkill WHERE OfferID = ?',
      [offerId]
    );
    if (!offerRows || offerRows.length === 0) {
      const err = new Error('Offer not found.');
      err.code = 'OFFER_NOT_FOUND';
      throw err;
    }

    const [convRows] = await conn.query(
      'SELECT 1 FROM Conversation WHERE ConversationID = ?',
      [conversationId]
    );
    if (!convRows || convRows.length === 0) {
      const err = new Error('Conversation not found.');
      err.code = 'CONVERSATION_NOT_FOUND';
      throw err;
    }

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

/**
 * Get exchange by id with offer/request/skill/conversation info.
 */
async function getById(exchangeId) {
  const [rows] = await getPool().query(
    `SELECT e.ExchangeID, e.OfferID, e.RequestID, e.ConversationID, e.ExchangeType, e.Status, e.CreatedAt,
            os.StudentID AS OffererStudentID, rs.StudentID AS RequesterStudentID,
            sk.SkillName, u_offer.FullName AS OffererName, u_req.FullName AS RequesterName
     FROM Exchange e
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     LEFT JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
     JOIN Skill sk ON sk.SkillID = os.SkillID
     JOIN Student so ON so.StudentID = os.StudentID
     JOIN User u_offer ON u_offer.UserID = so.StudentID
     LEFT JOIN Student sr ON sr.StudentID = rs.StudentID
     LEFT JOIN User u_req ON u_req.UserID = sr.StudentID
     WHERE e.ExchangeID = ?`,
    [exchangeId]
  );
  return rows[0] ?? null;
}

/**
 * List exchanges where the student is either offerer or requester.
 */
async function getByStudent(studentId) {
  const [rows] = await getPool().query(
    `SELECT e.ExchangeID, e.OfferID, e.RequestID, e.ConversationID, e.ExchangeType, e.Status, e.CreatedAt,
            sk.SkillName, u_offer.FullName AS OffererName, u_req.FullName AS RequesterName
     FROM Exchange e
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     LEFT JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
     JOIN Skill sk ON sk.SkillID = os.SkillID
     JOIN Student so ON so.StudentID = os.StudentID
     JOIN User u_offer ON u_offer.UserID = so.StudentID
     LEFT JOIN Student sr ON sr.StudentID = rs.StudentID
     LEFT JOIN User u_req ON u_req.UserID = sr.StudentID
     WHERE os.StudentID = ? OR rs.StudentID = ?
     ORDER BY e.CreatedAt DESC`,
    [studentId, studentId]
  );
  return rows;
}

/**
 * Update exchange status. Allowed: pending, active, completed, cancelled.
 */
async function updateStatus(exchangeId, status) {
  const allowed = ['pending', 'active', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return null;
  const [result] = await getPool().query(
    'UPDATE Exchange SET Status = ? WHERE ExchangeID = ?',
    [status, exchangeId]
  );
  if (result.affectedRows === 0) return null;
  return getById(exchangeId);
}

/** True if student is offerer or requester of this exchange */
async function isParticipant(exchangeId, studentId) {
  const [rows] = await getPool().query(
    `SELECT 1 FROM Exchange e
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     LEFT JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
     WHERE e.ExchangeID = ? AND (os.StudentID = ? OR rs.StudentID = ?)`,
    [exchangeId, studentId, studentId]
  );
  return rows.length > 0;
}

/** True if exchange involves at least one student at the given university (offerer or requester). */
async function isExchangeInUniversity(exchangeId, universityId) {
  const [rows] = await getPool().query(
    `SELECT 1 FROM Exchange e
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     JOIN Student so ON so.StudentID = os.StudentID
     LEFT JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
     LEFT JOIN Student sr ON sr.StudentID = rs.StudentID
     WHERE e.ExchangeID = ? AND (so.UniversityID = ? OR sr.UniversityID = ?)`,
    [exchangeId, universityId, universityId]
  );
  return rows.length > 0;
}

/** All exchanges (for superadmin). Same shape as getByStudent. */
async function getAll() {
  const [rows] = await getPool().query(
    `SELECT e.ExchangeID, e.OfferID, e.RequestID, e.ConversationID, e.ExchangeType, e.Status, e.CreatedAt,
            sk.SkillName, u_offer.FullName AS OffererName, u_req.FullName AS RequesterName
     FROM Exchange e
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     LEFT JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
     JOIN Skill sk ON sk.SkillID = os.SkillID
     JOIN Student so ON so.StudentID = os.StudentID
     JOIN User u_offer ON u_offer.UserID = so.StudentID
     LEFT JOIN Student sr ON sr.StudentID = rs.StudentID
     LEFT JOIN User u_req ON u_req.UserID = sr.StudentID
     ORDER BY e.CreatedAt DESC`
  );
  return rows;
}

/** Exchanges where offerer or requester is at the given university (admin uni-scoped). */
async function getByUniversity(universityId) {
  const [rows] = await getPool().query(
    `SELECT e.ExchangeID, e.OfferID, e.RequestID, e.ConversationID, e.ExchangeType, e.Status, e.CreatedAt,
            sk.SkillName, u_offer.FullName AS OffererName, u_req.FullName AS RequesterName
     FROM Exchange e
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     LEFT JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
     JOIN Skill sk ON sk.SkillID = os.SkillID
     JOIN Student so ON so.StudentID = os.StudentID
     JOIN User u_offer ON u_offer.UserID = so.StudentID
     LEFT JOIN Student sr ON sr.StudentID = rs.StudentID
     LEFT JOIN User u_req ON u_req.UserID = sr.StudentID
     WHERE so.UniversityID = ? OR sr.UniversityID = ?
     ORDER BY e.CreatedAt DESC`,
    [universityId, universityId]
  );
  return rows;
}

/**
 * Form 2: one or more Exchange + Session rows (+ VideoSession if online, PaidExchange + Payment if paid).
 * @param {object} params
 * @param {number} params.conversationId
 * @param {'physical'|'online'} params.meetingType
 * @param {string} params.venue
 * @param {string} params.scheduledStart
 * @param {string} params.scheduledEnd
 * @param {{ offerId: number, requestId: number, agreedPrice?: number }[]} params.pairs
 * @param {{ platform: string, meetingLink?: string, meetingPassword?: string }} [params.videoSession]
 * @param {string} [params.paymentMethod]
 */
async function confirmForm2ExchangeSessions(params) {
  const {
    conversationId,
    meetingType,
    venue,
    scheduledStart,
    scheduledEnd,
    pairs,
    videoSession,
    paymentMethod = 'Cash',
  } = params;

  if (!Array.isArray(pairs) || pairs.length === 0) {
    const err = new Error('At least one offer/request pair is required.');
    err.code = 'INVALID_PAIRS';
    throw err;
  }

  if (meetingType === 'online') {
    const platform = videoSession?.platform?.trim();
    if (!platform) {
      const err = new Error('Online meetings require videoSession.platform.');
      err.code = 'VIDEO_REQUIRED';
      throw err;
    }
  }

  return withTransaction(async (conn) => {
    const [convRows] = await conn.query(
      'SELECT Student1ID, Student2ID FROM Conversation WHERE ConversationID = ?',
      [conversationId]
    );
    if (!convRows.length) {
      const err = new Error('Conversation not found.');
      err.code = 'CONVERSATION_NOT_FOUND';
      throw err;
    }
    const s1 = Number(convRows[0].Student1ID);
    const s2 = Number(convRows[0].Student2ID);
    const participants = new Set([s1, s2]);

    const exchangeIds = [];
    const sessionIds = [];

    for (const pair of pairs) {
      const { offerId, requestId, agreedPrice } = pair;
      const [offRows] = await conn.query(
        'SELECT OfferID, StudentID, SkillID, IsPaid FROM OfferedSkill WHERE OfferID = ?',
        [offerId]
      );
      if (!offRows.length) {
        const err = new Error('Offer not found.');
        err.code = 'OFFER_NOT_FOUND';
        throw err;
      }
      const off = offRows[0];
      const [reqRows] = await conn.query(
        'SELECT RequestID, StudentID, SkillID, PreferredMode, Status FROM RequestedSkill WHERE RequestID = ?',
        [requestId]
      );
      if (!reqRows.length) {
        const err = new Error('Request not found.');
        err.code = 'REQUEST_NOT_FOUND';
        throw err;
      }
      const req = reqRows[0];

      const offerStudent = Number(off.StudentID);
      const requestStudent = Number(req.StudentID);
      if (offerStudent === requestStudent) {
        const err = new Error('Offer and request must belong to different students.');
        err.code = 'INVALID_PAIR';
        throw err;
      }
      if (!participants.has(offerStudent) || !participants.has(requestStudent)) {
        const err = new Error('Offer and request students must be the two conversation participants.');
        err.code = 'INVALID_PAIR';
        throw err;
      }
      if (Number(off.SkillID) !== Number(req.SkillID)) {
        const err = new Error('Offer and request must be for the same skill.');
        err.code = 'SKILL_MISMATCH';
        throw err;
      }
      if (String(req.Status) !== 'open') {
        const err = new Error('Request is not open.');
        err.code = 'REQUEST_NOT_OPEN';
        throw err;
      }
      if (!matchingService.modeMatches(off.IsPaid, req.PreferredMode)) {
        const err = new Error('Offer mode does not match request preferred mode.');
        err.code = 'MODE_MISMATCH';
        throw err;
      }

      const isPaid = Boolean(Number(off.IsPaid));
      if (isPaid) {
        if (agreedPrice == null || Number(agreedPrice) <= 0) {
          const err = new Error('Paid exchanges require agreedPrice > 0.');
          err.code = 'PRICE_REQUIRED';
          throw err;
        }
      }

      const exchangeType = isPaid ? 'paid' : 'Exchange';
      const [exResult] = await conn.query(
        `INSERT INTO Exchange (OfferID, RequestID, ConversationID, ExchangeType, Status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [offerId, requestId, conversationId, exchangeType]
      );
      const exchangeId = exResult.insertId;
      exchangeIds.push(exchangeId);

      const [sessResult] = await conn.query(
        `INSERT INTO Session (ExchangeID, ScheduledStartTime, ScheduledEndTime, Venue, Status)
         VALUES (?, ?, ?, ?, 'scheduled')`,
        [exchangeId, scheduledStart, scheduledEnd, venue]
      );
      const sessionId = sessResult.insertId;
      sessionIds.push(sessionId);

      if (meetingType === 'online') {
        await conn.query(
          `INSERT INTO VideoSession (SessionID, MeetingLink, MeetingPassword, Platform)
           VALUES (?, ?, ?, ?)`,
          [
            sessionId,
            videoSession?.meetingLink?.trim() || null,
            videoSession?.meetingPassword?.trim() || null,
            videoSession.platform.trim(),
          ]
        );
      }

      if (isPaid) {
        const price = Number(agreedPrice);
        await conn.query(
          'INSERT INTO PaidExchange (ExchangeID, Price, Currency) VALUES (?, ?, ?)',
          [exchangeId, price, 'PKR']
        );
        await conn.query(
          `INSERT INTO Payment (ExchangeID, Amount, PaymentStatus, PaymentMethod, PaidAt)
           VALUES (?, ?, 'completed', ?, NOW())`,
          [exchangeId, price, paymentMethod]
        );
      }

      await conn.query('UPDATE RequestedSkill SET Status = ? WHERE RequestID = ?', ['matched', requestId]);
    }

    await conversationService.clearExchangeReadinessConn(conn, conversationId);

    return { exchangeIds, sessionIds };
  });
}

module.exports = {
  matchRequestCreateExchangeSession,
  confirmForm2ExchangeSessions,
  createPaidExchangeWithPayment,
  getById,
  getByStudent,
  getByUniversity,
  getAll,
  updateStatus,
  isParticipant,
  isExchangeInUniversity,
};
