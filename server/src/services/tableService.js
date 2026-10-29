import { randomUUID } from 'node:crypto';
import { badRequest, conflict, notFound } from '../utils/httpError.js';

const ACTIVE_ORDER_STATUSES = ['pending', 'preparing', 'ready', 'served', 'bill_requested'];

export function listTables(db) {
  const tables = db.prepare('SELECT * FROM restaurant_tables ORDER BY number').all();
  const activeOrders = db
    .prepare(
      `SELECT table_id, COUNT(*) AS active_orders
       FROM orders WHERE status IN (${ACTIVE_ORDER_STATUSES.map(() => '?').join(',')})
       GROUP BY table_id`
    )
    .all(...ACTIVE_ORDER_STATUSES);
  const counts = new Map(activeOrders.map((r) => [r.table_id, r.active_orders]));
  return tables.map((t) => ({
    tableId: t.table_id,
    number: t.number,
    capacity: t.capacity,
    status: t.status,
    activeOrders: counts.get(t.table_id) ?? 0,
  }));
}

export function getTable(db, tableId) {
  const table = db.prepare('SELECT * FROM restaurant_tables WHERE table_id = ?').get(tableId);
  if (!table) throw notFound('Table not found');
  return table;
}

export function setTableStatus(db, tableId, status) {
  db.prepare('UPDATE restaurant_tables SET status = ? WHERE table_id = ?').run(status, tableId);
}

export function createTable(db, { number, capacity }) {
  const existing = db.prepare('SELECT 1 FROM restaurant_tables WHERE number = ?').get(number);
  if (existing) throw conflict(`Table ${number} already exists`);
  const tableId = randomUUID();
  db.prepare('INSERT INTO restaurant_tables (table_id, number, capacity) VALUES (?, ?, ?)').run(
    tableId,
    number,
    capacity
  );
  return getTable(db, tableId);
}

export function updateTable(db, tableId, { number, capacity }) {
  const existing = getTable(db, tableId);
  if (number !== undefined && number !== existing.number) {
    const clash = db.prepare('SELECT 1 FROM restaurant_tables WHERE number = ?').get(number);
    if (clash) throw conflict(`Table ${number} already exists`);
  }
  db.prepare('UPDATE restaurant_tables SET number = ?, capacity = ? WHERE table_id = ?').run(
    number ?? existing.number,
    capacity ?? existing.capacity,
    tableId
  );
  return getTable(db, tableId);
}

export function deleteTable(db, tableId) {
  getTable(db, tableId);
  const referenced = db.prepare('SELECT 1 FROM orders WHERE table_id = ? LIMIT 1').get(tableId);
  if (referenced) throw conflict('Table has order history and cannot be removed');
  db.prepare('DELETE FROM restaurant_tables WHERE table_id = ?').run(tableId);
}

// FR1: waiter selects a table — seating guests moves an empty table to
// "awaiting order" so the floor plan reflects it is in use.
export function seatTable(db, tableId) {
  const table = getTable(db, tableId);
  if (table.status !== 'empty') {
    throw badRequest(`Table is already ${table.status.replace('_', ' ')}`);
  }
  setTableStatus(db, tableId, 'awaiting_order');
  return getTable(db, tableId);
}
