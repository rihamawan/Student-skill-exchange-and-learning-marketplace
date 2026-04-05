/**
 * src/services/conversation.service.js
 * Conversation: list by student, get one, get-or-create between two students.
 */

const { getPool } = require('./db');
const matchingService = require('./matching.service');

async function getById(conversationId) {
  const [rows] = await getPool().query(
    `SELECT c.ConversationID, c.Student1ID, c.Student2ID, c.CreatedAt,
            c.Student1ExchangeReady, c.Student2ExchangeReady
     FROM Conversation c
     WHERE c.ConversationID = ?`,
    [conversationId]
  );
  return rows[0] ?? null;
}

async function getByStudent(studentId) {
  const [rows] = await getPool().query(
    `SELECT c.ConversationID, c.Student1ID, c.Student2ID, c.CreatedAt,
            c.Student1ExchangeReady, c.Student2ExchangeReady
     FROM Conversation c
     WHERE c.Student1ID = ? OR c.Student2ID = ?
     ORDER BY c.CreatedAt DESC`,
    [studentId, studentId]
  );
  return rows;
}

/** Get existing conversation between two students or create one. */
async function getOrCreate(student1Id, student2Id) {
  if (student1Id === student2Id) {
    const err = new Error('Cannot create conversation with yourself.');
    err.code = 'SAME_STUDENT';
    throw err;
  }
  const [existing] = await getPool().query(
    `SELECT ConversationID, Student1ID, Student2ID, CreatedAt,
            Student1ExchangeReady, Student2ExchangeReady
     FROM Conversation
     WHERE (Student1ID = ? AND Student2ID = ?) OR (Student1ID = ? AND Student2ID = ?)
     LIMIT 1`,
    [student1Id, student2Id, student2Id, student1Id]
  );
  if (existing && existing.length > 0) {
    return existing[0];
  }

  const { matched } = await matchingService.evaluateMutualMatch(student1Id, student2Id);
  if (!matched) {
    const err = new Error(
      'No match yet. For free exchange, both sides need a skill swap; for paid lessons, one side pays to learn what the other offers (same paid/free mode).'
    );
    err.code = 'MUTUAL_MATCH_REQUIRED';
    throw err;
  }

  const [result] = await getPool().query(
    'INSERT INTO Conversation (Student1ID, Student2ID) VALUES (?, ?)',
    [student1Id, student2Id]
  );
  return getById(result.insertId);
}

/** True if conversation involves this student */
async function isParticipant(conversationId, studentId) {
  const [rows] = await getPool().query(
    'SELECT 1 FROM Conversation WHERE ConversationID = ? AND (Student1ID = ? OR Student2ID = ?)',
    [conversationId, studentId, studentId]
  );
  return rows.length > 0;
}

/**
 * Set this student's Form 2 "ready to confirm" flag (slider).
 * @param {number} conversationId
 * @param {number} studentId
 * @param {boolean} ready
 * @returns {Promise<object|null>} Updated conversation row
 */
async function setExchangeReadiness(conversationId, studentId, ready) {
  const row = await getById(conversationId);
  if (!row) return null;
  const s1 = Number(row.Student1ID);
  const s2 = Number(row.Student2ID);
  if (studentId !== s1 && studentId !== s2) {
    const err = new Error('Not a participant.');
    err.code = 'FORBIDDEN';
    throw err;
  }
  const col = studentId === s1 ? 'Student1ExchangeReady' : 'Student2ExchangeReady';
  const val = ready ? 1 : 0;
  await getPool().query(`UPDATE Conversation SET ${col} = ? WHERE ConversationID = ?`, [val, conversationId]);
  return getById(conversationId);
}

/**
 * Inside a transaction: require both students have marked exchange readiness.
 * @param {import('mysql2/promise').PoolConnection} conn
 */
/**
 * @returns {Promise<{ s1: number, s2: number }>}
 */
async function assertBothExchangeReady(conn, conversationId) {
  const [rows] = await conn.query(
    `SELECT Student1ID, Student2ID, Student1ExchangeReady, Student2ExchangeReady
     FROM Conversation WHERE ConversationID = ? FOR UPDATE`,
    [conversationId]
  );
  const r = rows[0];
  if (!r) {
    const err = new Error('Conversation not found.');
    err.code = 'CONVERSATION_NOT_FOUND';
    throw err;
  }
  if (!Number(r.Student1ExchangeReady) || !Number(r.Student2ExchangeReady)) {
    const err = new Error(
      'Both students must turn on exchange readiness in this chat before confirming (Form 2).'
    );
    err.code = 'EXCHANGE_READINESS_REQUIRED';
    throw err;
  }
  return { s1: Number(r.Student1ID), s2: Number(r.Student2ID) };
}

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 */
async function clearExchangeReadinessConn(conn, conversationId) {
  await conn.query(
    'UPDATE Conversation SET Student1ExchangeReady = 0, Student2ExchangeReady = 0 WHERE ConversationID = ?',
    [conversationId]
  );
  await conn.query('DELETE FROM ConversationBundleReadiness WHERE ConversationID = ?', [conversationId]);
  await conn.query('DELETE FROM Form2SessionDraft WHERE ConversationID = ?', [conversationId]);
}

/**
 * Per-bundle Form 2 readiness (Student1/Student2 align with Conversation row).
 */
async function upsertBundleReadiness(conversationId, bundleKey, studentId, ready) {
  const row = await getById(conversationId);
  if (!row) return null;
  const s1 = Number(row.Student1ID);
  const s2 = Number(row.Student2ID);
  if (studentId !== s1 && studentId !== s2) {
    const err = new Error('Not a participant.');
    err.code = 'FORBIDDEN';
    throw err;
  }
  const [existing] = await getPool().query(
    'SELECT Student1Ready, Student2Ready FROM ConversationBundleReadiness WHERE ConversationID = ? AND BundleKey = ?',
    [conversationId, bundleKey]
  );
  let s1r = existing.length ? Number(existing[0].Student1Ready) : 0;
  let s2r = existing.length ? Number(existing[0].Student2Ready) : 0;
  if (studentId === s1) s1r = ready ? 1 : 0;
  else s2r = ready ? 1 : 0;
  await getPool().query(
    `INSERT INTO ConversationBundleReadiness (ConversationID, BundleKey, Student1Ready, Student2Ready)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE Student1Ready = VALUES(Student1Ready), Student2Ready = VALUES(Student2Ready)`,
    [conversationId, bundleKey, s1r, s2r]
  );
  const [out] = await getPool().query(
    'SELECT Student1Ready, Student2Ready FROM ConversationBundleReadiness WHERE ConversationID = ? AND BundleKey = ?',
    [conversationId, bundleKey]
  );
  return out[0];
}

async function getBundleReadinessRow(conversationId, bundleKey) {
  const [rows] = await getPool().query(
    'SELECT Student1Ready, Student2Ready FROM ConversationBundleReadiness WHERE ConversationID = ? AND BundleKey = ?',
    [conversationId, bundleKey]
  );
  return rows[0] ?? null;
}

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 */
async function assertBundleBothReadyConn(conn, conversationId, bundleKey) {
  const [rows] = await conn.query(
    `SELECT Student1ID, Student2ID FROM Conversation WHERE ConversationID = ? FOR UPDATE`,
    [conversationId]
  );
  const conv = rows[0];
  if (!conv) {
    const err = new Error('Conversation not found.');
    err.code = 'CONVERSATION_NOT_FOUND';
    throw err;
  }
  const [br] = await conn.query(
    'SELECT Student1Ready, Student2Ready FROM ConversationBundleReadiness WHERE ConversationID = ? AND BundleKey = ? FOR UPDATE',
    [conversationId, bundleKey]
  );
  const r = br[0];
  if (!r || !Number(r.Student1Ready) || !Number(r.Student2Ready)) {
    const err = new Error('Both students must turn on readiness for this exchange bundle before confirming.');
    err.code = 'EXCHANGE_READINESS_REQUIRED';
    throw err;
  }
  return { s1: Number(conv.Student1ID), s2: Number(conv.Student2ID) };
}

/**
 * Save session draft for one request row (learner must own the request).
 */
async function upsertForm2SessionDraft(conversationId, bundleKey, requestId, studentId, draft) {
  const [reqRows] = await getPool().query(
    'SELECT RequestID, StudentID FROM RequestedSkill WHERE RequestID = ?',
    [requestId]
  );
  const rq = reqRows[0];
  if (!rq || Number(rq.StudentID) !== studentId) {
    const err = new Error('You can only edit session details for your own request.');
    err.code = 'FORBIDDEN_DRAFT';
    throw err;
  }
  await getPool().query(
    `INSERT INTO Form2SessionDraft (
       ConversationID, BundleKey, RequestID, Venue, ScheduledStart, ScheduledEnd,
       MeetingType, Platform, MeetingLink, MeetingPassword, AgreedPrice
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       Venue = VALUES(Venue),
       ScheduledStart = VALUES(ScheduledStart),
       ScheduledEnd = VALUES(ScheduledEnd),
       MeetingType = VALUES(MeetingType),
       Platform = VALUES(Platform),
       MeetingLink = VALUES(MeetingLink),
       MeetingPassword = VALUES(MeetingPassword),
       AgreedPrice = VALUES(AgreedPrice)`,
    [
      conversationId,
      bundleKey,
      requestId,
      (draft.venue ?? '').toString().slice(0, 512),
      draft.scheduledStart || null,
      draft.scheduledEnd || null,
      draft.meetingType === 'online' ? 'online' : 'physical',
      draft.platform?.trim() || null,
      draft.meetingLink?.trim() || null,
      draft.meetingPassword?.trim() || null,
      draft.agreedPrice != null && draft.agreedPrice !== '' ? Number(draft.agreedPrice) : null,
    ]
  );
  return { success: true };
}

async function getForm2DraftsForBundle(conversationId, bundleKey) {
  const [rows] = await getPool().query(
    `SELECT RequestID, Venue, ScheduledStart, ScheduledEnd, MeetingType, Platform, MeetingLink, MeetingPassword, AgreedPrice
     FROM Form2SessionDraft WHERE ConversationID = ? AND BundleKey = ?`,
    [conversationId, bundleKey]
  );
  return rows;
}

module.exports = {
  getById,
  getByStudent,
  getOrCreate,
  isParticipant,
  setExchangeReadiness,
  assertBothExchangeReady,
  clearExchangeReadinessConn,
  upsertBundleReadiness,
  getBundleReadinessRow,
  assertBundleBothReadyConn,
  upsertForm2SessionDraft,
  getForm2DraftsForBundle,
};
