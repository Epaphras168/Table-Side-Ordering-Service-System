import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createTestContext,
  login,
  request,
  seedMenuItem,
  seedStaffAccount,
  seedTable,
} from './helpers.js';

async function setup() {
  const ctx = createTestContext();
  seedStaffAccount(ctx.db, { role: 'manager', username: 'mgr' });
  seedStaffAccount(ctx.db, { role: 'waiter', username: 'wtr' });
  seedStaffAccount(ctx.db, { role: 'kitchen', username: 'kit' });
  const managerToken = await login(ctx.app, 'mgr');
  const waiterToken = await login(ctx.app, 'wtr');
  const kitchenToken = await login(ctx.app, 'kit');
  const tableId = seedTable(ctx.db);
  const itemId = seedMenuItem(ctx.db, { name: 'Tilapia', price: 8500 });
  return { ...ctx, managerToken, waiterToken, kitchenToken, tableId, itemId };
}

test('placing an order occupies the table and is visible to the kitchen', async () => {
  const { app, waiterToken, tableId, itemId, events } = await setup();
  const { status, data } = await request(app, 'POST', '/api/orders', {
    token: waiterToken,
    body: { tableId, items: [{ itemId, quantity: 2 }] },
  });
  assert.equal(status, 201);
  assert.equal(data.status, 'pending');
  assert.equal(data.items.length, 1);
  assert.ok(events.some((e) => e.event === 'order:new'));
});

test('kitchen role cannot place an order', async () => {
  const { app, kitchenToken, tableId, itemId } = await setup();
  const { status } = await request(app, 'POST', '/api/orders', {
    token: kitchenToken,
    body: { tableId, items: [{ itemId, quantity: 1 }] },
  });
  assert.equal(status, 403);
});

test('order items can be modified while pending, but not once accepted', async () => {
  const { app, waiterToken, kitchenToken, tableId, itemId, db } = await setup();
  const order = await request(app, 'POST', '/api/orders', {
    token: waiterToken, body: { tableId, items: [{ itemId, quantity: 1 }] },
  });

  const added = await request(app, 'POST', `/api/orders/${order.data.order_id}/items`, {
    token: waiterToken, body: { itemId, quantity: 1 },
  });
  assert.equal(added.status, 200);
  assert.equal(added.data.items.length, 2);

  await request(app, 'POST', `/api/orders/${order.data.order_id}/accept`, { token: kitchenToken });

  const blocked = await request(app, 'POST', `/api/orders/${order.data.order_id}/items`, {
    token: waiterToken, body: { itemId, quantity: 1 },
  });
  assert.equal(blocked.status, 409);
});

test('full happy-path lifecycle: pending -> preparing -> ready -> served', async () => {
  const { app, waiterToken, kitchenToken, tableId, itemId, events } = await setup();
  const order = await request(app, 'POST', '/api/orders', {
    token: waiterToken, body: { tableId, items: [{ itemId, quantity: 1 }] },
  });
  const orderId = order.data.order_id;

  const accepted = await request(app, 'POST', `/api/orders/${orderId}/accept`, { token: kitchenToken });
  assert.equal(accepted.data.status, 'preparing');

  const ready = await request(app, 'POST', `/api/orders/${orderId}/ready`, { token: kitchenToken });
  assert.equal(ready.data.status, 'ready');
  assert.ok(events.some((e) => e.event === 'notification:order_ready'));

  const served = await request(app, 'POST', `/api/orders/${orderId}/serve`, { token: waiterToken });
  assert.equal(served.data.status, 'served');

  const illegal = await request(app, 'POST', `/api/orders/${orderId}/accept`, { token: kitchenToken });
  assert.equal(illegal.status, 409);
});

test('cancellation requires explicit confirmation and only works before ready', async () => {
  const { app, waiterToken, kitchenToken, tableId, itemId } = await setup();
  const order = await request(app, 'POST', '/api/orders', {
    token: waiterToken, body: { tableId, items: [{ itemId, quantity: 1 }] },
  });
  const orderId = order.data.order_id;

  const noConfirm = await request(app, 'POST', `/api/orders/${orderId}/cancel`, {
    token: waiterToken, body: {},
  });
  assert.equal(noConfirm.status, 400);

  const cancelled = await request(app, 'POST', `/api/orders/${orderId}/cancel`, {
    token: waiterToken, body: { confirm: true, reason: 'guest changed their mind' },
  });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.status, 'cancelled');

  await request(app, 'POST', '/api/orders', { token: waiterToken, body: { tableId, items: [{ itemId, quantity: 1 }] } });
  const second = await request(app, 'GET', `/api/orders?tableId=${tableId}`, { token: waiterToken });
  const pendingOrder = second.data.find((o) => o.status === 'pending');
  await request(app, 'POST', `/api/orders/${pendingOrder.order_id}/accept`, { token: kitchenToken });
  await request(app, 'POST', `/api/orders/${pendingOrder.order_id}/ready`, { token: kitchenToken });
  await request(app, 'POST', `/api/orders/${pendingOrder.order_id}/serve`, { token: waiterToken });

  const tooLate = await request(app, 'POST', `/api/orders/${pendingOrder.order_id}/cancel`, {
    token: waiterToken, body: { confirm: true },
  });
  assert.equal(tooLate.status, 409);
});

test('cancelling the only active order frees the table', async () => {
  const { app, waiterToken, tableId, itemId } = await setup();
  const order = await request(app, 'POST', '/api/orders', {
    token: waiterToken, body: { tableId, items: [{ itemId, quantity: 1 }] },
  });
  await request(app, 'POST', `/api/orders/${order.data.order_id}/cancel`, {
    token: waiterToken, body: { confirm: true },
  });

  const table = await request(app, 'GET', `/api/tables/${tableId}`, { token: waiterToken });
  assert.equal(table.data.status, 'empty');
});
