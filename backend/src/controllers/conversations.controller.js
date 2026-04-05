/**
 * src/controllers/conversations.controller.js
 * Conversation: list mine, get one, get-or-create. Messages: list, send (nested).
 */

const conversationService = require('../services/conversation.service');
const messageService = require('../services/message.service');
const userService = require('../services/user.service');
const { roomForConversation } = require('../socket');

function getStudentId(req) {
  if (String(req.user?.role ?? '').toLowerCase() !== 'student') return null;
  const id = req.user?.UserID ?? req.user?.userId ?? req.user?.id;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function toApiConv(row, viewerStudentId) {
  if (!row) return null;
  const s1 = Number(row.Student1ID);
  const s2 = Number(row.Student2ID);
  const r1 = row.Student1ExchangeReady != null ? Boolean(Number(row.Student1ExchangeReady)) : false;
  const r2 = row.Student2ExchangeReady != null ? Boolean(Number(row.Student2ExchangeReady)) : false;
  const out = {
    id: row.ConversationID,
    student1Id: row.Student1ID,
    student2Id: row.Student2ID,
    createdAt: row.CreatedAt,
    student1ExchangeReady: r1,
    student2ExchangeReady: r2,
  };
  const sid = viewerStudentId != null ? Number(viewerStudentId) : null;
  if (sid != null && Number.isFinite(sid)) {
    if (sid === s1) {
      out.myExchangeReady = r1;
      out.peerExchangeReady = r2;
    } else if (sid === s2) {
      out.myExchangeReady = r2;
      out.peerExchangeReady = r1;
    }
  }
  return out;
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
    const sid = Number(studentId);
    const data = await Promise.all(
      rows.map(async (row) => {
        const base = toApiConv(row, sid);
        const s1 = Number(row.Student1ID);
        const s2 = Number(row.Student2ID);
        let peerId = null;
        if (s1 === sid) peerId = s2;
        else if (s2 === sid) peerId = s1;
        const peerName =
          peerId != null && Number.isFinite(peerId)
            ? await userService.getFullNameByUserId(peerId)
            : null;
        const out = { ...base };
        if (peerId != null && Number.isFinite(peerId)) out.peerId = peerId;
        if (peerName) out.peerName = peerName;
        return out;
      })
    );
    res.status(200).json({ success: true, data });
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
    res.status(200).json({ success: true, data: toApiConv(row, studentId) });
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
    res.status(200).json({ success: true, data: toApiConv(conv, studentId) });
  } catch (err) {
    if (err.code === 'SAME_STUDENT') {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.code === 'MUTUAL_MATCH_REQUIRED') {
      return res.status(409).json({ success: false, error: err.message, code: err.code });
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

async function patchExchangeReadiness(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ success: false, error: 'Only students can update exchange readiness' });
    }
    const conversationId = Number(req.params.id);
    const allowed = await conversationService.isParticipant(conversationId, studentId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }
    const ready = Boolean(req.body.ready);
    const bundleKey = req.body.bundleKey != null ? String(req.body.bundleKey).trim() : '';

    let updated;
    if (bundleKey) {
      const row = await conversationService.upsertBundleReadiness(conversationId, bundleKey, studentId, ready);
      updated = await conversationService.getById(conversationId);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
    } else {
      updated = await conversationService.setExchangeReadiness(conversationId, studentId, ready);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(roomForConversation(conversationId)).emit('exchange_readiness', {
        conversationId,
        bundleKey: bundleKey || null,
        student1ExchangeReady: Boolean(Number(updated.Student1ExchangeReady)),
        student2ExchangeReady: Boolean(Number(updated.Student2ExchangeReady)),
      });
    }
    res.status(200).json({ success: true, data: toApiConv(updated, studentId) });
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ success: false, error: err.message });
    }
    console.error('conversations.patchExchangeReadiness', err);
    res.status(500).json({ success: false, error: 'Failed to update exchange readiness' });
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
    const io = req.app.get('io');
    if (io && msg) {
      io.to(roomForConversation(conversationId)).emit('message', toApiMsg(msg));
    }
    res.status(201).json({ success: true, data: toApiMsg(msg) });
  } catch (err) {
    console.error('conversations.sendMessage', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}

module.exports = { list, get, getOrCreate, patchExchangeReadiness, listMessages, sendMessage };
