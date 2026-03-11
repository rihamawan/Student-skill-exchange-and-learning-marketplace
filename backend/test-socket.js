/**
 * Test script: Socket.io live chat.
 * 1. Ensure two students exist (register if needed).
 * 2. Login as A and B, get-or-create conversation.
 * 3. Connect socket as B, join conversation.
 * 4. Send message as A via REST.
 * 5. Assert B receives 'message' event.
 *
 * Run from backend: node test-socket.js
 * Optional env: BASE_URL=http://localhost:5000
 */

const io = require('socket.io-client');

const BASE = process.env.BASE_URL || 'http://localhost:5000';

async function getFirstUniversityId() {
  const res = await fetch(`${BASE}/api/v1/universities`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.data ?? data?.data?.data;
  if (list && list[0]) return list[0].id ?? list[0].UniversityID;
  return 1;
}

async function register(email, password, fullName, universityId) {
  const res = await fetch(`${BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName, universityId }),
  });
  const data = await res.json();
  if (res.status === 201 && data.success && data.data?.token) return data.data;
  if (res.status === 400 && data.error && /already|exist/i.test(data.error)) return null;
  throw new Error('Register failed: ' + (data.error || res.status));
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success || !data.data?.token) throw new Error('Login failed: ' + (data.error || res.status));
  return data.data;
}

async function ensureStudent(email, password, fullName) {
  try {
    return await login(email, password);
  } catch {
    const univId = await getFirstUniversityId();
    const reg = await register(email, password, fullName, univId);
    if (reg) return reg;
    return await login(email, password);
  }
}

async function getOrCreateConversation(tokenA, otherStudentId) {
  const res = await fetch(`${BASE}/api/v1/conversations/get-or-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ otherStudentId }),
  });
  const data = await res.json();
  if (!data.success || !data.data?.id) throw new Error('Get-or-create failed: ' + (data.error || res.status));
  return data.data.id;
}

async function sendMessage(tokenA, conversationId, content) {
  const res = await fetch(`${BASE}/api/v1/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Send message failed: ' + (data.error || res.status));
  return data.data;
}

function connectSocket(tokenB, conversationId) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token: `Bearer ${tokenB}` } });
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('Socket: join or message timeout'));
    }, 10000);

    socket.on('connect', () => {
      socket.emit('join_conversation', { conversationId }, (res) => {
        if (res && res.success) {
          resolve(socket);
        } else {
          clearTimeout(timeout);
          socket.close();
          reject(new Error('Join failed: ' + (res?.error || 'no response')));
        }
      });
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      socket.close();
      reject(err);
    });
  });
}

async function main() {
  const aEmail = process.env.A_EMAIL || 'studentA@example.com';
  const aPass = process.env.A_PASS || 'password123';
  const bEmail = process.env.B_EMAIL || 'studentB@example.com';
  const bPass = process.env.B_PASS || 'password123';

  console.log('1. Ensure Student A exists and login...');
  const dataA = await ensureStudent(aEmail, aPass, 'Student A');
  const tokenA = dataA.token;

  console.log('2. Ensure Student B exists and login...');
  const dataB = await ensureStudent(bEmail, bPass, 'Student B');
  const tokenB = dataB.token;
  const studentBId = dataB.user?.id ?? dataB.user?.UserID;
  if (!studentBId) throw new Error('B user id not in response');

  console.log('3. Get-or-create conversation (A with B)...');
  const convId = await getOrCreateConversation(tokenA, studentBId);
  console.log('   Conversation ID:', convId);

  console.log('4. Connect socket as B and join room...');
  const socket = await connectSocket(tokenB, convId);
  console.log('   Socket connected and joined.');

  const received = [];
  socket.on('message', (msg) => {
    received.push(msg);
    console.log('   [Socket] received message:', msg.content);
  });

  console.log('5. Send message as A via REST...');
  const sent = await sendMessage(tokenA, convId, 'Socket test at ' + new Date().toISOString());
  console.log('   REST returned message id:', sent.id);

  await new Promise((r) => setTimeout(r, 1500));
  socket.close();

  if (received.length === 0) {
    console.error('\nFAIL: Socket did not receive the message.');
    process.exit(1);
  }
  const last = received[received.length - 1];
  if (String(last.content) !== String(sent.content) || last.id !== sent.id) {
    console.error('\nFAIL: Received message does not match sent.', { sent, received: last });
    process.exit(1);
  }
  console.log('\nPASS: Socket received the same message as sent via REST.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
