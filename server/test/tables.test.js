import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestContext, login, request, seedStaffAccount, seedTable } from './helpers.js';

async function setup() {
  const ctx = createTestContext();
  seedStaffAccount(ctx.db, { role: 'manager', username: 'mgr' });
  seedStaffAccount(ctx.db, { role: 'waiter', username: 'wtr' });
  const managerToken = await login(ctx.app, 'mgr');
  const waiterToken = await login(ctx.app, 'wtr');
  return { ...ctx, managerToken, waiterToken };
}

test('manager can create a table; duplicates are rejected', async () => {
  const { app, managerToken } = await setup();
  const created = await request(app, 'POST', '/api/tables', {
    token: managerToken, body: { number: 42, capacity: 4 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'empty');

  const dup = await request(app, 'POST', '/api/tables', {
    token: managerToken, body: { number: 42, capacity: 6 },
  });
  assert.equal(dup.status, 409);
});

test('waiter cannot create a table', async () => {
  const { app, waiterToken } = await setup();
  const { status } = await request(app, 'POST', '/api/tables', {
    token: waiterToken, body: { number: 5, capacity: 2 },
  });
  assert.equal(status, 403);
});

test('seating an empty table moves it to awaiting_order, not twice', async () => {
  const { app, db, waiterToken } = await setup();
  const tableId = seedTable(db, 7);

  const first = await request(app, 'POST', `/api/tables/${tableId}/seat`, { token: waiterToken });
  assert.equal(first.status, 200);
  assert.equal(first.data.status, 'awaiting_order');

  const second = await request(app, 'POST', `/api/tables/${tableId}/seat`, { token: waiterToken });
  assert.equal(second.status, 400);
});

test('table list reports active order counts', async () => {
  const { app, db, managerToken } = await setup();
  seedTable(db, 11);

  const { status, data } = await request(app, 'GET', '/api/tables', { token: managerToken });
  assert.equal(status, 200);
  const seeded = data.find((t) => t.number === 11);
  assert.equal(seeded.activeOrders, 0);
});
