/**
 * src/services/conversation.service.js
 * Conversation: list by student, get one, get-or-create between two students.
 */

const { getPool } = require('./db');

async function getById(conversationId) {
  const [rows] = await getPool().query(
    `SELECT c.ConversationID, c.Student1ID, c.Student2ID, c.CreatedAt
     FROM Conversation c
     WHERE c.ConversationID = ?`,
    [conversationId]
  );
  return rows[0] ?? null;
}

async function getByStudent(studentId) {
  const [rows] = await getPool().query(
    `SELECT c.ConversationID, c.Student1ID, c.Student2ID, c.CreatedAt
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
    `SELECT ConversationID, Student1ID, Student2ID, CreatedAt
     FROM Conversation
     WHERE (Student1ID = ? AND Student2ID = ?) OR (Student1ID = ? AND Student2ID = ?)
     LIMIT 1`,
    [student1Id, student2Id, student2Id, student1Id]
  );
  if (existing && existing.length > 0) {
    return existing[0];
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

module.exports = {
  getById,
  getByStudent,
  getOrCreate,
  isParticipant,
};
