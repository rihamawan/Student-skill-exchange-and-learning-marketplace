/**
 * src/services/message.service.js
 * Message: list by conversation, send. Used under conversations resource.
 */

const { getPool } = require('./db');

async function getByConversation(conversationId, limit = 100) {
  const [rows] = await getPool().query(
    `SELECT m.MessageID, m.ConversationID, m.SenderID, m.Content, m.IsRead, m.CreatedAt,
            u.FullName AS SenderName
     FROM Message m
     JOIN User u ON u.UserID = m.SenderID
     WHERE m.ConversationID = ?
     ORDER BY m.CreatedAt ASC
     LIMIT ?`,
    [conversationId, limit]
  );
  return rows;
}

async function send(conversationId, senderId, content) {
  const [result] = await getPool().query(
    'INSERT INTO Message (ConversationID, SenderID, Content) VALUES (?, ?, ?)',
    [conversationId, senderId, content]
  );
  const [rows] = await getPool().query(
    `SELECT m.MessageID, m.ConversationID, m.SenderID, m.Content, m.IsRead, m.CreatedAt
     FROM Message m WHERE m.MessageID = ?`,
    [result.insertId]
  );
  return rows[0] ?? null;
}

module.exports = { getByConversation, send };
