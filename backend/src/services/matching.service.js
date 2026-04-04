/**
 * Mutual skill matching (Form 1 rules), Form 1 persistence, Form 2 eligibility.
 */

const { getPool } = require('./db');
const { withTransaction } = require('./transactions');
const universityService = require('./university.service');

const PREFERRED_TIMES = new Set(['Morning', 'Evenings', 'Weekdays', 'Weekends', 'Flexible']);
const PREFERRED_MODES = new Set(['Exchange', 'Paid']);

function modeMatches(isPaid, preferredMode) {
  const paid = Boolean(Number(isPaid));
  if (preferredMode === 'Paid') return paid;
  if (preferredMode === 'Exchange') return !paid;
  return false;
}

/**
 * Learner's open request + teacher's offer: same skill, mode aligned.
 * @returns {{ offerId: number, requestId: number, skillId: number, isPaid: boolean } | null}
 */
function findTeachingPair(learnerRequests, teacherOffers) {
  for (const req of learnerRequests) {
    if (String(req.Status) !== 'open') continue;
    for (const off of teacherOffers) {
      if (Number(req.SkillID) === Number(off.SkillID) && modeMatches(off.IsPaid, req.PreferredMode)) {
        return {
          offerId: Number(off.OfferID),
          requestId: Number(req.RequestID),
          skillId: Number(req.SkillID),
          isPaid: Boolean(Number(off.IsPaid)),
        };
      }
    }
  }
  return null;
}

/**
 * Same as findTeachingPair but only for a specific learner request row (RequestID).
 */
function findTeachingPairForRequest(learnerRequests, teacherOffers, requestId) {
  const rid = Number(requestId);
  const req = learnerRequests.find((r) => Number(r.RequestID) === rid);
  if (!req || String(req.Status) !== 'open') return null;
  for (const off of teacherOffers) {
    if (Number(req.SkillID) === Number(off.SkillID) && modeMatches(off.IsPaid, req.PreferredMode)) {
      return {
        offerId: Number(off.OfferID),
        requestId: Number(req.RequestID),
        skillId: Number(req.SkillID),
        isPaid: Boolean(Number(off.IsPaid)),
      };
    }
  }
  return null;
}

/** Learner pays for lessons — no second skill swap required for a match. */
function isPaidTutoringLink(learnerRequests, link) {
  if (!link) return false;
  const req = learnerRequests.find((r) => Number(r.RequestID) === Number(link.requestId));
  return req != null && String(req.PreferredMode) === 'Paid';
}

async function loadOffers(studentId) {
  const [rows] = await getPool().query(
    'SELECT OfferID, StudentID, SkillID, IsPaid, PricePerHour FROM OfferedSkill WHERE StudentID = ?',
    [studentId]
  );
  return rows;
}

async function loadRequests(studentId) {
  const [rows] = await getPool().query(
    `SELECT RequestID, StudentID, SkillID, PreferredTime, PreferredMode, Status
     FROM RequestedSkill WHERE StudentID = ?`,
    [studentId]
  );
  return rows;
}

/**
 * Match rules:
 * - **Exchange** requests: need both directions (I teach you / you teach me) with mode-aligned offer↔request pairs.
 * - **Paid** requests: paying to learn counts as a match with only that direction (no reciprocal skill required).
 */
async function evaluateMutualMatch(studentIdA, studentIdB) {
  const [aOff, aReq, bOff, bReq] = await Promise.all([
    loadOffers(studentIdA),
    loadRequests(studentIdA),
    loadOffers(studentIdB),
    loadRequests(studentIdB),
  ]);

  const aLearnsFromB = findTeachingPair(aReq, bOff);
  const bLearnsFromA = findTeachingPair(bReq, aOff);

  const twoWaySwap = Boolean(aLearnsFromB && bLearnsFromA);
  const paidAFromB = Boolean(aLearnsFromB && isPaidTutoringLink(aReq, aLearnsFromB));
  const paidBFromA = Boolean(bLearnsFromA && isPaidTutoringLink(bReq, bLearnsFromA));
  const matched = Boolean(twoWaySwap || paidAFromB || paidBFromA);

  return {
    matched,
    aLearnsFromB,
    bLearnsFromA,
  };
}

/**
 * Other students at the same university who mutually match this student (same rules as evaluateMutualMatch).
 * @returns {Promise<Array<{ studentId: number, fullName: string }>>}
 */
async function listMutualMatchesForStudent(studentId) {
  const pool = getPool();
  const [meRows] = await pool.query('SELECT UniversityID FROM Student WHERE StudentID = ?', [studentId]);
  if (!meRows.length) {
    return [];
  }
  const uniId = meRows[0].UniversityID;
  const [peers] = await pool.query(
    'SELECT StudentID FROM Student WHERE UniversityID = ? AND StudentID <> ?',
    [uniId, studentId]
  );
  const out = [];
  for (const p of peers) {
    const other = Number(p.StudentID);
    if (!Number.isFinite(other) || other < 1) continue;
    const { matched } = await evaluateMutualMatch(studentId, other);
    if (!matched) continue;
    const [urows] = await pool.query('SELECT FullName FROM User WHERE UserID = ?', [other]);
    const fullName = urows[0]?.FullName != null ? String(urows[0].FullName) : 'Student';
    out.push({ studentId: other, fullName });
  }
  return out;
}

/**
 * Scoped to one of A's requests. If that row is **Paid**, only A learning from B on this request must line up.
 * If **Exchange**, require the usual two-way swap (B also learns something from A).
 */
async function evaluateMutualMatchForRequest(studentIdA, studentIdB, requestId) {
  const [aOff, aReq, bOff, bReq] = await Promise.all([
    loadOffers(studentIdA),
    loadRequests(studentIdA),
    loadOffers(studentIdB),
    loadRequests(studentIdB),
  ]);

  const aLearnsFromB = findTeachingPairForRequest(aReq, bOff, requestId);
  const bLearnsFromA = findTeachingPair(bReq, aOff);

  const reqRow = aReq.find((r) => Number(r.RequestID) === Number(requestId));
  const requestIsPaid = reqRow != null && String(reqRow.PreferredMode) === 'Paid';

  const matched = requestIsPaid
    ? Boolean(aLearnsFromB)
    : Boolean(aLearnsFromB && bLearnsFromA);

  return {
    matched,
    aLearnsFromB,
    bLearnsFromA,
  };
}

/**
 * Peers at the same university valid for this open request (paid = teacher offers this skill for pay; exchange = two-way swap).
 * For paid requests, includes their offer price so the learner can compare (request side has no price column).
 * @returns {Promise<Array<{ studentId: number, fullName: string, offerId: number | null, pricePerHour: number | null, isPaidOffer: boolean }>>}
 */
async function listMutualMatchesForRequest(studentId, requestId) {
  const pool = getPool();
  const rid = Number(requestId);
  if (!Number.isFinite(rid) || rid < 1) {
    return [];
  }

  const [reqRows] = await pool.query(
    'SELECT RequestID, StudentID, Status FROM RequestedSkill WHERE RequestID = ?',
    [rid]
  );
  if (!reqRows.length) {
    const err = new Error('Request not found.');
    err.code = 'REQUEST_NOT_FOUND';
    throw err;
  }
  const row = reqRows[0];
  if (Number(row.StudentID) !== studentId) {
    const err = new Error('Not your request.');
    err.code = 'FORBIDDEN';
    throw err;
  }
  if (String(row.Status) !== 'open') {
    return [];
  }

  const [meRows] = await pool.query('SELECT UniversityID FROM Student WHERE StudentID = ?', [studentId]);
  if (!meRows.length) {
    return [];
  }
  const uniId = meRows[0].UniversityID;
  const [peers] = await pool.query(
    'SELECT StudentID FROM Student WHERE UniversityID = ? AND StudentID <> ?',
    [uniId, studentId]
  );

  const out = [];
  for (const p of peers) {
    const other = Number(p.StudentID);
    if (!Number.isFinite(other) || other < 1) continue;
    const { matched, aLearnsFromB } = await evaluateMutualMatchForRequest(studentId, other, rid);
    if (!matched) continue;
    const [urows] = await pool.query('SELECT FullName FROM User WHERE UserID = ?', [other]);
    const fullName = urows[0]?.FullName != null ? String(urows[0].FullName) : 'Student';

    let offerId = aLearnsFromB?.offerId != null ? Number(aLearnsFromB.offerId) : null;
    let pricePerHour = null;
    let isPaidOffer = Boolean(aLearnsFromB?.isPaid);
    if (offerId != null && Number.isFinite(offerId)) {
      const [offRows] = await pool.query(
        'SELECT PricePerHour, IsPaid FROM OfferedSkill WHERE OfferID = ?',
        [offerId]
      );
      const orow = offRows[0];
      if (orow) {
        isPaidOffer = Boolean(Number(orow.IsPaid));
        pricePerHour = orow.PricePerHour != null ? Number(orow.PricePerHour) : null;
      }
    }

    out.push({ studentId: other, fullName, offerId, pricePerHour, isPaidOffer });
  }
  out.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return out;
}

/**
 * Match profile no longer creates OfferedSkill rows (use Offered skills + quiz). Validates wanted skills only.
 * Free-exchange requests require at least one offer already stored (from Offered skills).
 */
async function assertForm1ProfileRequests(studentId, requested) {
  const r = Array.isArray(requested) ? requested : [];
  const pool = getPool();
  const [[offerRow]] = await pool.query(
    'SELECT COUNT(*) AS c FROM OfferedSkill WHERE StudentID = ?',
    [studentId]
  );
  const [[reqRow]] = await pool.query(
    'SELECT COUNT(*) AS c FROM RequestedSkill WHERE StudentID = ?',
    [studentId]
  );
  const hasOfferInDb = Number(offerRow?.c) > 0;
  const hasRequestInDb = Number(reqRow?.c) > 0;

  if (r.length === 0) {
    if (!hasOfferInDb && !hasRequestInDb) {
      const err = new Error(
        'Add wanted skills below and/or add teaching offers under Offered skills (with quiz if required).'
      );
      err.code = 'INVALID_INPUT';
      throw err;
    }
    return;
  }

  const hasExchange = r.some((row) => String(row.preferredMode) === 'Exchange');
  if (hasExchange && !hasOfferInDb) {
    const err = new Error(
      'Free exchange requests need at least one skill on Offered skills first (evaluation may be required).'
    );
    err.code = 'INVALID_INPUT';
    throw err;
  }
}

/**
 * Update name + university. Optional: replace open RequestedSkill rows (legacy; use Requested skills tab).
 * Never writes OfferedSkill. Profile-only save sends requested: [].
 */
async function saveMatchForm1(userId, payload) {
  const { fullName, universityId, requested: rawRequested } = payload;
  const requested = Array.isArray(rawRequested) ? rawRequested : [];
  const updateRequests = requested.length > 0;

  const uni = await universityService.getById(universityId);
  if (!uni) {
    const err = new Error('University not found.');
    err.code = 'UNIVERSITY_NOT_FOUND';
    throw err;
  }

  if (updateRequests) {
    for (const r of requested) {
      if (!PREFERRED_TIMES.has(r.preferredTime)) {
        const err = new Error(`Invalid preferredTime: ${r.preferredTime}`);
        err.code = 'INVALID_INPUT';
        throw err;
      }
      if (!PREFERRED_MODES.has(r.preferredMode)) {
        const err = new Error(`Invalid preferredMode: ${r.preferredMode}`);
        err.code = 'INVALID_INPUT';
        throw err;
      }
    }

    for (const r of requested) {
      const sid = Number(r.skillId);
      if (!Number.isFinite(sid) || sid < 1) {
        const err = new Error('Each wanted skill row must have a skill selected.');
        err.code = 'INVALID_INPUT';
        throw err;
      }
    }

    await assertForm1ProfileRequests(userId, requested);
  }

  const requestedDedup = updateRequests
    ? [...new Map(requested.map((r) => [Number(r.skillId), r])).values()]
    : [];

  return withTransaction(async (conn) => {
    const [userRows] = await conn.query('SELECT 1 FROM User WHERE UserID = ?', [userId]);
    if (!userRows.length) {
      const err = new Error('User not found.');
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    const [stRows] = await conn.query('SELECT 1 FROM Student WHERE StudentID = ?', [userId]);
    if (!stRows.length) {
      const err = new Error('Student profile not found.');
      err.code = 'NOT_STUDENT';
      throw err;
    }

    await conn.query('UPDATE User SET FullName = ? WHERE UserID = ?', [fullName.trim(), userId]);
    await conn.query('UPDATE Student SET UniversityID = ? WHERE StudentID = ?', [universityId, userId]);

    if (requestedDedup.length > 0) {
      await conn.query(
        `DELETE rs FROM RequestedSkill rs
         WHERE rs.StudentID = ?
         AND NOT EXISTS (SELECT 1 FROM Exchange e WHERE e.RequestID = rs.RequestID)`,
        [userId]
      );

      for (const r of requestedDedup) {
        await conn.query(
          `INSERT INTO RequestedSkill (StudentID, SkillID, PreferredTime, PreferredMode, Status)
           VALUES (?, ?, ?, ?, 'open')`,
          [userId, r.skillId, r.preferredTime, r.preferredMode]
        );
      }
    }

    return { success: true };
  });
}

/**
 * Suggested exchange rows for Form 2 (IDs for POST confirm-form2).
 */
async function getForm2Eligibility(conversationId, studentId) {
  const [convRows] = await getPool().query(
    `SELECT ConversationID, Student1ID, Student2ID,
            Student1ExchangeReady, Student2ExchangeReady
     FROM Conversation WHERE ConversationID = ?`,
    [conversationId]
  );
  const conv = convRows[0];
  if (!conv) {
    const err = new Error('Conversation not found.');
    err.code = 'CONVERSATION_NOT_FOUND';
    throw err;
  }
  const s1 = Number(conv.Student1ID);
  const s2 = Number(conv.Student2ID);
  if (studentId !== s1 && studentId !== s2) {
    const err = new Error('Not a participant.');
    err.code = 'FORBIDDEN';
    throw err;
  }
  const peerId = studentId === s1 ? s2 : s1;
  const iAmReady = studentId === s1 ? Boolean(Number(conv.Student1ExchangeReady)) : Boolean(Number(conv.Student2ExchangeReady));
  const peerReady = studentId === s1 ? Boolean(Number(conv.Student2ExchangeReady)) : Boolean(Number(conv.Student1ExchangeReady));

  const [myOff, myReq, peerOff, peerReq] = await Promise.all([
    loadOffers(studentId),
    loadRequests(studentId),
    loadOffers(peerId),
    loadRequests(peerId),
  ]);

  const iTeachPeer = findTeachingPair(peerReq, myOff);
  const peerTeachesMe = findTeachingPair(myReq, peerOff);

  return {
    conversationId: Number(conversationId),
    peerStudentId: peerId,
    iTeachPeer,
    peerTeachesMe,
    mutualSwapReady: Boolean(iTeachPeer && peerTeachesMe),
    exchangeReadiness: {
      iAmReady,
      peerReady,
      bothReady: iAmReady && peerReady,
    },
  };
}

module.exports = {
  modeMatches,
  evaluateMutualMatch,
  evaluateMutualMatchForRequest,
  listMutualMatchesForStudent,
  listMutualMatchesForRequest,
  saveMatchForm1,
  getForm2Eligibility,
  PREFERRED_TIMES,
  PREFERRED_MODES,
};
