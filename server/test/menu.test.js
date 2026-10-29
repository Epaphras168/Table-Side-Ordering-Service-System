import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createTestContext,
  login,
  request,
  seedStaffAccount,
} from './helpers.js';

async function setup() {
  const ctx = createTestContext();
  seedStaffAccount(ctx.db, { role: 'manager', username: 'mgr' });
  seedStaffAccount(ctx.db, { role: 'waiter', username: 'wtr' });
  const managerToken = await login(ctx.app, 'mgr');
  const waiterToken = await login(ctx.app, 'wtr');
  return { ...ctx, managerToken, waiterToken };
}

test('rejects menu access without a token', async () => {
  const { app } = await setup();
  const { status } = await request(app, 'GET', '/api/menu');
  assert.equal(status, 401);
});

test('any authenticated staff can browse the menu', async () => {
  const { app, waiterToken } = await setup();
  const { status, data } = await request(app, 'GET', '/api/menu', { token: waiterToken });
  assert.equal(status, 200);
  assert.deepEqual(data, []);
});

test('only a manager can create a menu item', async () => {
  const { app, managerToken, waiterToken } = await setup();

  const denied = await request(app, 'POST', '/api/menu', {
    token: waiterToken,
    body: { name: 'Grilled Tilapia', category: 'Main', price: 8500 },
  });
  assert.equal(denied.status, 403);

  const created = await request(app, 'POST', '/api/menu', {
    token: managerToken,
    body: { name: 'Grilled Tilapia', category: 'Main', price: 8500 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.available, true);
});

test('rejects a menu item without a price', async () => {
  const { app, managerToken } = await setup();
  const { status, data } = await request(app, 'POST', '/api/menu', {
    token: managerToken,
    body: { name: 'Mystery Dish', category: 'Main' },
  });
  assert.equal(status, 400);
  assert.match(data.error, /price/);
});

test('lists menu items filtered by category', async () => {
  const { app, managerToken } = await setup();
  await request(app, 'POST', '/api/menu', { token: managerToken, body: { name: 'Tilapia', category: 'Main', price: 8500 } });
  await request(app, 'POST', '/api/menu', { token: managerToken, body: { name: 'Juice', category: 'Beverage', price: 2000 } });

  const { status, data } = await request(app, 'GET', '/api/menu?category=Beverage', { token: managerToken });
  assert.equal(status, 200);
  assert.equal(data.length, 1);
  assert.equal(data[0].name, 'Juice');
});

test('edits a menu item price', async () => {
  const { app, managerToken } = await setup();
  const created = await request(app, 'POST', '/api/menu', {
    token: managerToken, body: { name: 'Samosa', category: 'Starter', price: 1200 },
  });

  const { status, data } = await request(app, 'PUT', `/api/menu/${created.data.item_id}`, {
    token: managerToken, body: { price: 1500 },
  });
  assert.equal(status, 200);
  assert.equal(data.price, 1500);
  assert.equal(data.name, 'Samosa');
});

test('deletes an unreferenced menu item outright', async () => {
  const { app, managerToken } = await setup();
  const created = await request(app, 'POST', '/api/menu', {
    token: managerToken, body: { name: 'Mandazi', category: 'Dessert', price: 500 },
  });

  const { status, data } = await request(app, 'DELETE', `/api/menu/${created.data.item_id}`, { token: managerToken });
  assert.equal(status, 200);
  assert.equal(data.removed, true);

  const lookup = await request(app, 'GET', `/api/menu/${created.data.item_id}`, { token: managerToken });
  assert.equal(lookup.status, 404);
});

test('disables instead of deleting a menu item referenced by an order', async () => {
  const { app, db, managerToken, waiterToken } = await setup();
  const created = await request(app, 'POST', '/api/menu', {
    token: managerToken, body: { name: 'Brochettes', category: 'Main', price: 4000 },
  });

  db.prepare("INSERT INTO restaurant_tables (table_id, number, capacity) VALUES ('t1', 999, 4)").run();
  const order = await request(app, 'POST', '/api/orders', {
    token: waiterToken,
    body: { tableId: 't1', items: [{ itemId: created.data.item_id, quantity: 2 }] },
  });
  assert.equal(order.status, 201);

  const { status, data } = await request(app, 'DELETE', `/api/menu/${created.data.item_id}`, { token: managerToken });
  assert.equal(status, 200);
  assert.equal(data.removed, false);
  assert.equal(data.disabled, true);

  const lookup = await request(app, 'GET', `/api/menu/${created.data.item_id}`, { token: managerToken });
  assert.equal(lookup.status, 200);
  assert.equal(lookup.data.available, false);
});
