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

async function setupServedOrder({ price = 10000 } = {}) {
  const ctx = createTestContext();
  seedStaffAccount(ctx.db, { role: 'manager', username: 'mgr' });
  seedStaffAccount(ctx.db, { role: 'waiter', username: 'wtr' });
  seedStaffAccount(ctx.db, { role: 'kitchen', username: 'kit' });
  const managerToken = await login(ctx.app, 'mgr');
  const waiterToken = await login(ctx.app, 'wtr');
  const kitchenToken = await login(ctx.app, 'kit');
  const tableId = seedTable(ctx.db);
  const itemId = seedMenuItem(ctx.db, { price });

  const order = await request(ctx.app, 'POST', '/api/orders', {
    token: waiterToken, body: { tableId, items: [{ itemId, quantity: 1 }] },
  });
  await request(ctx.app, 'POST', `/api/orders/${order.data.order_id}/accept`, { token: kitchenToken });
  await request(ctx.app, 'POST', `/api/orders/${order.data.order_id}/ready`, { token: kitchenToken });
  await request(ctx.app, 'POST', `/api/orders/${order.data.order_id}/serve`, { token: waiterToken });

  return { ...ctx, managerToken, waiterToken, kitchenToken, tableId, itemId, orderId: order.data.order_id };
}

test('generating a bill computes tax and service charge, and blocks re-billing', async () => {
  const { app, waiterToken, tableId } = await setupServedOrder({ price: 10000 });

  const { status, data } = await request(app, 'POST', '/api/bills', {
    token: waiterToken, body: { tableIds: [tableId] },
  });
  assert.equal(status, 201);
  assert.equal(data.subtotal, 10000);
  assert.equal(data.tax, 1800); // 18% VAT
  assert.equal(data.service_charge, 1000); // 10% service charge
  assert.equal(data.total, 12800);

  const again = await request(app, 'POST', '/api/bills', { token: waiterToken, body: { tableIds: [tableId] } });
  assert.equal(again.status, 400);
});

test('full payment settles the bill and frees the table', async () => {
  const { app, waiterToken, tableId } = await setupServedOrder({ price: 10000 });
  const bill = await request(app, 'POST', '/api/bills', { token: waiterToken, body: { tableIds: [tableId] } });

  const payment = await request(app, 'POST', `/api/bills/${bill.data.bill_id}/payments`, {
    token: waiterToken, body: { method: 'mobile_money', amount: bill.data.total },
  });
  assert.equal(payment.status, 201);
  assert.equal(payment.data.status, 'paid');

  const table = await request(app, 'GET', `/api/tables/${tableId}`, { token: waiterToken });
  assert.equal(table.data.status, 'empty');
});

test('splitting a bill into even shares and paying them individually', async () => {
  const { app, waiterToken, tableId } = await setupServedOrder({ price: 9999 });
  const bill = await request(app, 'POST', '/api/bills', { token: waiterToken, body: { tableIds: [tableId] } });

  const split = await request(app, 'POST', `/api/bills/${bill.data.bill_id}/split`, {
    token: waiterToken, body: { parts: 3 },
  });
  assert.equal(split.status, 200);
  assert.equal(split.data.shares.length, 3);
  const sum = Math.round(split.data.shares.reduce((a, s) => a + s.amount, 0) * 100) / 100;
  assert.equal(sum, split.data.total);

  for (const share of split.data.shares) {
    const paid = await request(app, 'POST', `/api/bills/${bill.data.bill_id}/payments`, {
      token: waiterToken, body: { shareId: share.share_id, method: 'cash', amount: share.amount },
    });
    assert.equal(paid.status, 201);
  }

  const final = await request(app, 'GET', `/api/bills/${bill.data.bill_id}`, { token: waiterToken });
  assert.equal(final.data.status, 'paid');
});

test('merging two tables into one bill', async () => {
  const a = await setupServedOrder({ price: 5000 });
  const tableB = a.tableId; // reuse context's db for a second table/order
  const itemId2 = a.itemId;

  const tableId2 = (await request(a.app, 'POST', '/api/tables', {
    token: a.managerToken, body: { number: 777, capacity: 4 },
  })).data.table_id;

  const order2 = await request(a.app, 'POST', '/api/orders', {
    token: a.waiterToken, body: { tableId: tableId2, items: [{ itemId: itemId2, quantity: 1 }] },
  });
  await request(a.app, 'POST', `/api/orders/${order2.data.order_id}/accept`, { token: a.kitchenToken });
  await request(a.app, 'POST', `/api/orders/${order2.data.order_id}/ready`, { token: a.kitchenToken });
  await request(a.app, 'POST', `/api/orders/${order2.data.order_id}/serve`, { token: a.waiterToken });

  const merged = await request(a.app, 'POST', '/api/bills', {
    token: a.waiterToken, body: { tableIds: [tableB, tableId2] },
  });
  assert.equal(merged.status, 201);
  assert.equal(merged.data.subtotal, 10000);
  assert.equal(merged.data.tables.length, 2);
});

test('bill generation rejects unserved orders', async () => {
  const { app, db, waiterToken, kitchenToken } = await setupServedOrder();
  // A second, still-preparing order on a fresh table should not be billable yet.
  const tableId = seedTable(db);
  const itemId = seedMenuItem(db);
  const order = await request(app, 'POST', '/api/orders', {
    token: waiterToken, body: { tableId, items: [{ itemId, quantity: 1 }] },
  });
  await request(app, 'POST', `/api/orders/${order.data.order_id}/accept`, { token: kitchenToken });

  const attempt = await request(app, 'POST', '/api/bills', { token: waiterToken, body: { tableIds: [tableId] } });
  assert.equal(attempt.status, 400);
});
