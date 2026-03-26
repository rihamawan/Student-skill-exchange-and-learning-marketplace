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
      'No mutual match yet. Both students need complementary offer/request skills with the same mode (free exchange or paid).'
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
}

module.exports = {
  getById,
  getByStudent,
  getOrCreate,
  isParticipant,
  setExchangeReadiness,
  assertBothExchangeReady,
  clearExchangeReadinessConn,
};
