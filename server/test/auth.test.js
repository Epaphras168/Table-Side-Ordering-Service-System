import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestContext, login, request, seedStaffAccount, SEED_PASSWORD } from './helpers.js';

test('logs in with correct credentials and returns a usable token', async () => {
  const { app, db } = createTestContext();
  seedStaffAccount(db, { role: 'manager', username: 'mgr', name: 'Manager Mia' });

  const loginRes = await request(app, 'POST', '/api/auth/login', {
    body: { username: 'mgr', password: SEED_PASSWORD },
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.data.staff.name, 'Manager Mia');
  assert.equal(loginRes.data.staff.role, 'manager');

  const me = await request(app, 'GET', '/api/auth/me', { token: loginRes.data.token });
  assert.equal(me.status, 200);
  assert.equal(me.data.username, 'mgr');
});

test('rejects a wrong password', async () => {
  const { app, db } = createTestContext();
  seedStaffAccount(db, { role: 'waiter', username: 'wtr' });

  const { status, data } = await request(app, 'POST', '/api/auth/login', {
    body: { username: 'wtr', password: 'wrong-password' },
  });
  assert.equal(status, 401);
  assert.match(data.error, /invalid/i);
});

test('rejects a deactivated account', async () => {
  const { app, db } = createTestContext();
  const { staffId } = seedStaffAccount(db, { role: 'waiter', username: 'wtr' });
  db.prepare('UPDATE staff SET active = 0 WHERE staff_id = ?').run(staffId);

  const { status } = await request(app, 'POST', '/api/auth/login', {
    body: { username: 'wtr', password: SEED_PASSWORD },
  });
  assert.equal(status, 401);
});

test('rejects a malformed or missing bearer token', async () => {
  const { app } = createTestContext();
  const missing = await request(app, 'GET', '/api/auth/me');
  assert.equal(missing.status, 401);

  const malformed = await request(app, 'GET', '/api/auth/me', { token: 'not-a-real-token' });
  assert.equal(malformed.status, 401);
});

test('manager-only routes reject other roles', async () => {
  const { app, db } = createTestContext();
  seedStaffAccount(db, { role: 'kitchen', username: 'kit' });
  const token = await login(app, 'kit');

  const { status } = await request(app, 'GET', '/api/staff', { token });
  assert.equal(status, 403);
});
