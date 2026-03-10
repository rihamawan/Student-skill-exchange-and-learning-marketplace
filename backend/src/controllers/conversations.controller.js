/**
 * src/controllers/conversations.controller.js
 * Conversation: list mine, get one, get-or-create. Messages: list, send (nested).
 */

const conversationService = require('../services/conversation.service');
const messageService = require('../services/message.service');

function getStudentId(req) {
  return req.user?.role === 'student' ? req.user.UserID : null;
}

function toApiConv(row) {
  if (!row) return null;
  return {
    id: row.ConversationID,
    student1Id: row.Student1ID,
    student2Id: row.Student2ID,
    createdAt: row.CreatedAt,
  };
}

function toApiMsg(row) {
  if (!row) return null;
  return {
    id: row.MessageID,
    conversationId: row.ConversationID,
    senderId: row.SenderID,
    senderName: row.SenderName,
    content: row.Content,
    isRead: Boolean(row.IsRead),
    createdAt: row.CreatedAt,
  };
}

async function list(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can list conversations' });
    }
    const rows = await conversationService.getByStudent(studentId);
    res.status(200).json({ success: true, data: rows.map(toApiConv) });
  } catch (err) {
    console.error('conversations.list', err);
    res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
}

async function get(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can view conversations' });
    }
    const id = Number(req.params.id);
    const row = await conversationService.getById(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    const allowed = await conversationService.isParticipant(id, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }
    res.status(200).json({ success: true, data: toApiConv(row) });
  } catch (err) {
    console.error('conversations.get', err);
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
}

async function getOrCreate(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can start conversations' });
    }
    const otherStudentId = Number(req.body.otherStudentId);
    const conv = await conversationService.getOrCreate(studentId, otherStudentId);
    res.status(200).json({ success: true, data: toApiConv(conv) });
  } catch (err) {
    if (err.code === 'SAME_STUDENT') {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('conversations.getOrCreate', err);
    res.status(500).json({ success: false, error: 'Failed to get or create conversation' });
  }
}

async function listMessages(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can list messages' });
    }
    const conversationId = Number(req.params.id);
    const allowed = await conversationService.isParticipant(conversationId, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const rows = await messageService.getByConversation(conversationId, limit);
    res.status(200).json({ success: true, data: rows.map(toApiMsg) });
  } catch (err) {
    console.error('conversations.listMessages', err);
    res.status(500).json({ success: false, error: 'Failed to list messages' });
  }
}

async function sendMessage(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can send messages' });
    }
    const conversationId = Number(req.params.id);
    const allowed = await conversationService.isParticipant(conversationId, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }
    const content = (req.body.content ?? '').trim();
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    const msg = await messageService.send(conversationId, studentId, content);
    res.status(201).json({ success: true, data: toApiMsg(msg) });
  } catch (err) {
    console.error('conversations.sendMessage', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}

module.exports = { list, get, getOrCreate, listMessages, sendMessage };
