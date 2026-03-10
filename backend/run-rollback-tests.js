
const BASE = process.env.API_BASE || 'http://localhost:5000';

async function login(email, password) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data?.data?.token) {
    throw new Error(data?.error || 'Login failed: ' + res.status);
  }
  return data.data.token;
}

async function runRequest(name, token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  console.log(`\n--- ${name} ---`);
  console.log(`Status: ${res.status}`);
  console.log('Response:', JSON.stringify(data, null, 2));
  return { status: res.status, data };
}

async function main() {
  let token = process.env.ROLLBACK_TOKEN;
  if (!token) {
    const email = process.env.STUDENT_EMAIL;
    const password = process.env.STUDENT_PASSWORD;
    if (!email || !password) {
      console.error('Set either:');
      console.error('  ROLLBACK_TOKEN=<jwt>   (token from login), or');
      console.error('  STUDENT_EMAIL=... and STUDENT_PASSWORD=... (student account)');
      process.exit(1);
    }
    console.log('Logging in as', email, '...');
    token = await login(email, password);
  } else {
    console.log('Using ROLLBACK_TOKEN. Sending 4 rollback-trigger requests...\n');
  }
  if (!token) process.exit(1);
  console.log('Got token. Sending 4 rollback-trigger requests...\n');

  await runRequest(
    'Rollback 1: Exchange not found. (paid-exchange, exchangeId 999999)',
    token,
    'POST',
    '/api/v1/transactions/paid-exchange',
    { exchangeId: 999999, price: 100 }
  );

  await runRequest(
    'Rollback 2: Request not found or not open. (match-request, requestId 999999)',
    token,
    'POST',
    '/api/v1/transactions/match-request',
    {
      offerId: 1,
      requestId: 999999,
      conversationId: 1,
      scheduledStart: '2025-03-15 10:00:00',
      scheduledEnd: '2025-03-15 11:00:00',
    }
  );

  await runRequest(
    'Rollback 3: Offer not found. (match-request, offerId 999999)',
    token,
    'POST',
    '/api/v1/transactions/match-request',
    {
      offerId: 999999,
      requestId: 1,
      conversationId: 1,
      scheduledStart: '2025-03-15 10:00:00',
      scheduledEnd: '2025-03-15 11:00:00',
    }
  );

  await runRequest(
    'Rollback 4: Conversation not found. (match-request, conversationId 999999)',
    token,
    'POST',
    '/api/v1/transactions/match-request',
    {
      offerId: 1,
      requestId: 1,
      conversationId: 999999,
      scheduledStart: '2025-03-15 10:00:00',
      scheduledEnd: '2025-03-15 11:00:00',
    }
  );

  console.log('\nDone. Copy the 4 "[Transaction] ROLLBACK — ..." lines from the BACKEND terminal into media/rollback-log.txt');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
