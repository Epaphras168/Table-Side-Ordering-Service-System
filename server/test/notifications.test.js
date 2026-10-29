import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestContext, login, request, seedStaffAccount, seedTable } from './helpers.js';

test('waiter can raise an urgent alert and it is logged with a timestamp', async () => {
  const { app, db, events } = createTestContext();
  seedStaffAccount(db, { role: 'waiter', username: 'wtr' });
  seedStaffAccount(db, { role: 'manager', username: 'mgr' });
  const waiterToken = await login(app, 'wtr');
  const managerToken = await login(app, 'mgr');
  const tableId = seedTable(db, 21);

  const { status, data } = await request(app, 'POST', '/api/notifications/urgent-alert', {
    token: waiterToken, body: { tableId, message: 'Guest needs assistance' },
  });
  assert.equal(status, 201);
  assert.ok(data.timestamp);
  assert.ok(events.some((e) => e.event === 'notification:urgent_alert'));

  const log = await request(app, 'GET', '/api/notifications', { token: managerToken });
  assert.equal(log.status, 200);
  assert.ok(log.data.some((n) => n.type === 'urgent_alert'));
});

test('kitchen cannot raise an urgent alert', async () => {
  const { app, db } = createTestContext();
  seedStaffAccount(db, { role: 'kitchen', username: 'kit' });
  const token = await login(app, 'kit');
  const tableId = seedTable(db, 22);

  const { status } = await request(app, 'POST', '/api/notifications/urgent-alert', {
    token, body: { tableId, message: 'Order delayed' },
  });
  assert.equal(status, 403);
});
