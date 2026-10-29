import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db/index.js';

let db;
let app;

before(() => {
  db = openDb(':memory:');
  app = createApp(db);
});

beforeEach(() => {
  db.exec('DELETE FROM menu_items; DELETE FROM order_items; DELETE FROM orders;');
});

after(() => {
  db.close();
});

async function request(method, path, body) {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = res.status === 204 ? null : await res.json();
    return { status: res.status, data };
  } finally {
    server.close();
  }
}

test('creates a menu item', async () => {
  const { status, data } = await request('POST', '/api/menu', {
    name: 'Grilled Tilapia',
    category: 'Main',
    price: 8500,
  });
  assert.equal(status, 201);
  assert.equal(data.name, 'Grilled Tilapia');
  assert.equal(data.available, true);
});

test('rejects a menu item without a price', async () => {
  const { status, data } = await request('POST', '/api/menu', {
    name: 'Mystery Dish',
    category: 'Main',
  });
  assert.equal(status, 400);
  assert.match(data.error, /price/);
});

test('lists menu items filtered by category', async () => {
  await request('POST', '/api/menu', { name: 'Tilapia', category: 'Main', price: 8500 });
  await request('POST', '/api/menu', { name: 'Juice', category: 'Beverage', price: 2000 });

  const { status, data } = await request('GET', '/api/menu?category=Beverage');
  assert.equal(status, 200);
  assert.equal(data.length, 1);
  assert.equal(data[0].name, 'Juice');
});

test('edits a menu item price', async () => {
  const created = await request('POST', '/api/menu', {
    name: 'Samosa', category: 'Starter', price: 1200,
  });

  const { status, data } = await request('PUT', `/api/menu/${created.data.item_id}`, {
    price: 1500,
  });
  assert.equal(status, 200);
  assert.equal(data.price, 1500);
  assert.equal(data.name, 'Samosa');
});

test('deletes an unreferenced menu item outright', async () => {
  const created = await request('POST', '/api/menu', {
    name: 'Mandazi', category: 'Dessert', price: 500,
  });

  const { status, data } = await request('DELETE', `/api/menu/${created.data.item_id}`);
  assert.equal(status, 200);
  assert.equal(data.removed, true);

  const lookup = await request('GET', `/api/menu/${created.data.item_id}`);
  assert.equal(lookup.status, 404);
});

test('disables instead of deleting a menu item referenced by an order', async () => {
  const created = await request('POST', '/api/menu', {
    name: 'Brochettes', category: 'Main', price: 4000,
  });

  db.prepare(
    "INSERT INTO staff (staff_id, name, role, username, password_hash) VALUES ('s1', 'Epa', 'waiter', 'epa', 'x')"
  ).run();
  db.prepare(
    "INSERT INTO restaurant_tables (table_id, number, capacity) VALUES ('t1', 1, 4)"
  ).run();
  db.prepare(
    "INSERT INTO orders (order_id, table_id, waiter_id) VALUES ('o1', 't1', 's1')"
  ).run();
  db.prepare(
    'INSERT INTO order_items (order_item_id, order_id, item_id, quantity) VALUES (?, ?, ?, ?)'
  ).run('oi1', 'o1', created.data.item_id, 2);

  const { status, data } = await request('DELETE', `/api/menu/${created.data.item_id}`);
  assert.equal(status, 200);
  assert.equal(data.removed, false);
  assert.equal(data.disabled, true);

  const lookup = await request('GET', `/api/menu/${created.data.item_id}`);
  assert.equal(lookup.status, 200);
  assert.equal(lookup.data.available, false);
});
