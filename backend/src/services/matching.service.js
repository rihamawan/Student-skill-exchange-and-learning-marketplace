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
 * True when each student has at least one skill they want that the other offers (mode match),
 * and vice versa (typical two-way swap uses two different skills).
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

  const matched = Boolean(aLearnsFromB && bLearnsFromA);
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
 * Replace offers/requests not tied to an Exchange; update name + university.
 */
async function saveMatchForm1(userId, payload) {
  const { fullName, universityId, offered, requested } = payload;

  const uni = await universityService.getById(universityId);
  if (!uni) {
    const err = new Error('University not found.');
    err.code = 'UNIVERSITY_NOT_FOUND';
    throw err;
  }

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

  for (const o of offered) {
    if (o.isPaid && (o.pricePerHour == null || Number(o.pricePerHour) < 0)) {
      const err = new Error('Paid offers require a non-negative price per hour.');
      err.code = 'INVALID_INPUT';
      throw err;
    }
  }

  if (!Array.isArray(offered) || offered.length === 0) {
    const err = new Error('At least one offered skill is required.');
    err.code = 'INVALID_INPUT';
    throw err;
  }
  if (!Array.isArray(requested) || requested.length === 0) {
    const err = new Error('At least one requested skill is required.');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const offeredDedup = [...new Map(offered.map((o) => [Number(o.skillId), o])).values()];
  const requestedDedup = [...new Map(requested.map((r) => [Number(r.skillId), r])).values()];

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

    await conn.query(
      `DELETE os FROM OfferedSkill os
       WHERE os.StudentID = ?
       AND NOT EXISTS (SELECT 1 FROM Exchange e WHERE e.OfferID = os.OfferID)`,
      [userId]
    );
    await conn.query(
      `DELETE rs FROM RequestedSkill rs
       WHERE rs.StudentID = ?
       AND NOT EXISTS (SELECT 1 FROM Exchange e WHERE e.RequestID = rs.RequestID)`,
      [userId]
    );

    for (const o of offeredDedup) {
      const isPaid = o.isPaid ? 1 : 0;
      const price = isPaid && o.pricePerHour != null ? Number(o.pricePerHour) : null;
      await conn.query(
        'INSERT INTO OfferedSkill (StudentID, SkillID, IsPaid, PricePerHour) VALUES (?, ?, ?, ?)',
        [userId, o.skillId, isPaid, price]
      );
    }

    for (const r of requestedDedup) {
      await conn.query(
        `INSERT INTO RequestedSkill (StudentID, SkillID, PreferredTime, PreferredMode, Status)
         VALUES (?, ?, ?, ?, 'open')`,
        [userId, r.skillId, r.preferredTime, r.preferredMode]
      );
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
  listMutualMatchesForStudent,
  saveMatchForm1,
  getForm2Eligibility,
  PREFERRED_TIMES,
  PREFERRED_MODES,
};
