import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestContext, login, request, seedStaffAccount, SEED_PASSWORD } from './helpers.js';

test('manager can create a staff account and the new account can log in', async () => {
  const { app, db } = createTestContext();
  seedStaffAccount(db, { role: 'manager', username: 'mgr' });
  const managerToken = await login(app, 'mgr');

  const created = await request(app, 'POST', '/api/staff', {
    token: managerToken,
    body: { name: 'New Waiter', role: 'waiter', username: 'newbie', password: 'Secret123!' },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.active, true);

  const loginRes = await request(app, 'POST', '/api/auth/login', {
    body: { username: 'newbie', password: 'Secret123!' },
  });
  assert.equal(loginRes.status, 200);
});

test('rejects duplicate usernames', async () => {
  const { app, db } = createTestContext();
  seedStaffAccount(db, { role: 'manager', username: 'mgr' });
  seedStaffAccount(db, { role: 'waiter', username: 'taken' });
  const managerToken = await login(app, 'mgr');

  const { status } = await request(app, 'POST', '/api/staff', {
    token: managerToken,
    body: { name: 'Another', role: 'waiter', username: 'taken', password: 'Secret123!' },
  });
  assert.equal(status, 409);
});

test('deactivating a staff account blocks future logins', async () => {
  const { app, db } = createTestContext();
  seedStaffAccount(db, { role: 'manager', username: 'mgr' });
  const { staffId } = seedStaffAccount(db, { role: 'waiter', username: 'wtr' });
  const managerToken = await login(app, 'mgr');

  const update = await request(app, 'PUT', `/api/staff/${staffId}`, {
    token: managerToken, body: { active: false },
  });
  assert.equal(update.status, 200);
  assert.equal(update.data.active, false);

  const loginRes = await request(app, 'POST', '/api/auth/login', {
    body: { username: 'wtr', password: SEED_PASSWORD },
  });
  assert.equal(loginRes.status, 401);
});
