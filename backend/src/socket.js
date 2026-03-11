/**
 * src/socket.js
 * Socket.io: attach to HTTP server, auth on connect, join conversation rooms.
 * Messages are sent via REST; server emits new messages to room after save.
 */

const { Server } = require('socket.io');
const authService = require('./services/auth.service');
const userService = require('./services/user.service');
const conversationService = require('./services/conversation.service');

function getToken(handshake) {
  const auth = handshake.auth?.token;
  if (auth && typeof auth === 'string') return auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth;
  const q = handshake.query?.token;
  return typeof q === 'string' ? q.trim() : null;
}

function roomForConversation(conversationId) {
  return `conversation:${conversationId}`;
}

function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = getToken(socket.handshake);
      if (!token) {
        return next(new Error('Missing token'));
      }
      const payload = authService.verifyToken(token);
      const userId = payload.userId ?? payload.UserID;
      if (userId == null) {
        return next(new Error('Invalid token'));
      }
      const user = await userService.getUserById(Number(userId));
      if (!user) {
        return next(new Error('User not found'));
      }
      const { PasswordHash, ...userWithoutPassword } = user;
      socket.user = userWithoutPassword;
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (user.role !== 'student') {
      socket.disconnect(true);
      return;
    }

    socket.on('join_conversation', async (data, callback) => {
      const conversationId = Number(data?.conversationId);
      if (!conversationId || conversationId < 1) {
        if (typeof callback === 'function') callback({ success: false, error: 'Invalid conversationId' });
        return;
      }
      try {
        const allowed = await conversationService.isParticipant(conversationId, user.UserID);
        if (!allowed) {
          if (typeof callback === 'function') callback({ success: false, error: 'Not a participant' });
          return;
        }
        socket.join(roomForConversation(conversationId));
        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        console.error('socket join_conversation', err);
        if (typeof callback === 'function') callback({ success: false, error: 'Failed to join' });
      }
    });

    socket.on('leave_conversation', (data) => {
      const conversationId = Number(data?.conversationId);
      if (conversationId && conversationId >= 1) {
        socket.leave(roomForConversation(conversationId));
      }
    });
  });

  return io;
}

module.exports = {
  attachSocket,
  roomForConversation,
};
