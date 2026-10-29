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

test('sales report reflects a completed, paid order', async () => {
  const { app, db } = createTestContext();
  seedStaffAccount(db, { role: 'manager', username: 'mgr' });
  seedStaffAccount(db, { role: 'waiter', username: 'wtr' });
  seedStaffAccount(db, { role: 'kitchen', username: 'kit' });
  const managerToken = await login(app, 'mgr');
  const waiterToken = await login(app, 'wtr');
  const kitchenToken = await login(app, 'kit');
  const tableId = seedTable(db);
  const itemId = seedMenuItem(db, { name: 'Tilapia', category: 'Main', price: 10000 });

  const order = await request(app, 'POST', '/api/orders', {
    token: waiterToken, body: { tableId, items: [{ itemId, quantity: 1 }] },
  });
  await request(app, 'POST', `/api/orders/${order.data.order_id}/accept`, { token: kitchenToken });
  await request(app, 'POST', `/api/orders/${order.data.order_id}/ready`, { token: kitchenToken });
  await request(app, 'POST', `/api/orders/${order.data.order_id}/serve`, { token: waiterToken });
  const bill = await request(app, 'POST', '/api/bills', { token: waiterToken, body: { tableIds: [tableId] } });
  await request(app, 'POST', `/api/bills/${bill.data.bill_id}/payments`, {
    token: waiterToken, body: { method: 'cash', amount: bill.data.total },
  });

  const { status, data } = await request(app, 'GET', '/api/reports/sales', { token: managerToken });
  assert.equal(status, 200);
  assert.equal(data.revenue, bill.data.total);
  assert.equal(data.orderCount, 1);
  assert.equal(data.byMethod[0].method, 'cash');
  assert.equal(data.topItems[0].name, 'Tilapia');
});

test('reports are manager-only', async () => {
  const { app, db } = createTestContext();
  seedStaffAccount(db, { role: 'waiter', username: 'wtr' });
  const token = await login(app, 'wtr');

  const { status } = await request(app, 'GET', '/api/reports/sales', { token });
  assert.equal(status, 403);
});
