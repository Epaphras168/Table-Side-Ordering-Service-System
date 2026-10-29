import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db/index.js';

export const SEED_PASSWORD = 'TestPass123!';

export function createTestContext() {
  const db = openDb(':memory:');
  const events = [];
  const broadcast = (event, payload, filter) => events.push({ event, payload, filter });
  const app = createApp(db, { broadcast });
  return { db, app, events };
}

export function seedStaffAccount(db, { role, username = `${role}-${randomUUID().slice(0, 8)}`, name = role }) {
  const staffId = randomUUID();
  db.prepare(
    'INSERT INTO staff (staff_id, name, role, username, password_hash) VALUES (?, ?, ?, ?, ?)'
  ).run(staffId, name, role, username, bcrypt.hashSync(SEED_PASSWORD, 4));
  return { staffId, username, role };
}

export function seedTable(db, number = Math.floor(Math.random() * 100000)) {
  const tableId = randomUUID();
  db.prepare('INSERT INTO restaurant_tables (table_id, number, capacity) VALUES (?, ?, 4)').run(tableId, number);
  return tableId;
}

export function seedMenuItem(db, { name = 'Test Item', category = 'Main', price = 1000 } = {}) {
  const itemId = randomUUID();
  db.prepare('INSERT INTO menu_items (item_id, name, category, price) VALUES (?, ?, ?, ?)').run(
    itemId,
    name,
    category,
    price
  );
  return itemId;
}

export async function request(app, method, path, { token, body } = {}) {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return { status: res.status, data };
  } finally {
    server.close();
  }
}

export async function login(app, username, password = SEED_PASSWORD) {
  const { data } = await request(app, 'POST', '/api/auth/login', { body: { username, password } });
  return data.token;
}
