import { randomUUID } from 'node:crypto';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { getTable, setTableStatus } from './tableService.js';

// Mirrors docs/diagrams/05_state.puml. 'bill_requested' is entered by the
// billing service and 'closed' by the payment service, not from here.
const TRANSITIONS = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
};

function assertTransition(order, next) {
  const allowed = TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(next)) {
    throw conflict(`Cannot move order from "${order.status}" to "${next}"`);
  }
}

export function getOrder(db, orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
  if (!order) throw notFound('Order not found');
  return order;
}

export function getOrderWithItems(db, orderId) {
  const order = getOrder(db, orderId);
  return { ...order, items: listOrderItems(db, orderId) };
}

function listOrderItems(db, orderId) {
  return db
    .prepare(
      `SELECT oi.order_item_id, oi.item_id, oi.quantity, oi.unit_price, oi.status, oi.notes,
              mi.name, mi.category
       FROM order_items oi
       JOIN menu_items mi ON mi.item_id = oi.item_id
       WHERE oi.order_id = ?`
    )
    .all(orderId);
}

export function listOrders(db, { tableId, statuses } = {}) {
  const clauses = [];
  const params = [];
  if (tableId) {
    clauses.push('table_id = ?');
    params.push(tableId);
  }
  if (statuses?.length) {
    clauses.push(`status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const orders = db.prepare(`SELECT * FROM orders ${where} ORDER BY created_at`).all(...params);
  return orders.map((order) => ({ ...order, items: listOrderItems(db, order.order_id) }));
}

function setOrderStatus(db, orderId, status) {
  db.prepare(
    `UPDATE orders SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE order_id = ?`
  ).run(status, orderId);
  db.prepare('UPDATE order_items SET status = ? WHERE order_id = ?').run(status, orderId);
}

// FR2/FR4: waiter places an order; it is immediately visible to the
// kitchen (status = pending) in line with 02_sequence.puml.
export function placeOrder(db, { tableId, waiterId, items }) {
  if (!items?.length) throw badRequest('An order needs at least one item');

  const table = getTable(db, tableId);
  if (table.status === 'awaiting_bill') {
    throw conflict('This table is waiting on a bill; resolve it before adding a new order');
  }

  const menuRows = db
    .prepare(`SELECT * FROM menu_items WHERE item_id IN (${items.map(() => '?').join(',')})`)
    .all(...items.map((i) => i.itemId));
  const menuById = new Map(menuRows.map((r) => [r.item_id, r]));

  for (const { itemId, quantity } of items) {
    const menuItem = menuById.get(itemId);
    if (!menuItem) throw badRequest(`Menu item ${itemId} does not exist`);
    if (!menuItem.available) throw badRequest(`"${menuItem.name}" is not currently available`);
    if (!Number.isInteger(quantity) || quantity < 1) throw badRequest('Quantity must be a positive integer');
  }

  const orderId = randomUUID();
  const run = db.transaction(() => {
    db.prepare('INSERT INTO orders (order_id, table_id, waiter_id) VALUES (?, ?, ?)').run(
      orderId,
      tableId,
      waiterId
    );
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_item_id, order_id, item_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const { itemId, quantity, notes } of items) {
      insertItem.run(randomUUID(), orderId, itemId, quantity, menuById.get(itemId).price, notes ?? null);
    }
    setTableStatus(db, tableId, 'occupied');
  });
  run();

  return getOrderWithItems(db, orderId);
}

function assertModifiable(order) {
  if (order.status !== 'pending') {
    throw conflict('Order items can only be changed while the order is still pending (not yet accepted by the kitchen)');
  }
}

// FR3: add/remove/change quantity before the kitchen accepts the order.
export function addOrderItem(db, orderId, { itemId, quantity, notes }) {
  const order = getOrder(db, orderId);
  assertModifiable(order);
  const menuItem = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(itemId);
  if (!menuItem || !menuItem.available) throw badRequest('Menu item unavailable');
  if (!Number.isInteger(quantity) || quantity < 1) throw badRequest('Quantity must be a positive integer');

  db.prepare(
    'INSERT INTO order_items (order_item_id, order_id, item_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), orderId, itemId, quantity, menuItem.price, notes ?? null);
  return getOrderWithItems(db, orderId);
}

export function removeOrderItem(db, orderId, orderItemId) {
  const order = getOrder(db, orderId);
  assertModifiable(order);
  const remaining = db.prepare('SELECT COUNT(*) AS n FROM order_items WHERE order_id = ?').get(orderId).n;
  if (remaining <= 1) throw badRequest('An order needs at least one item — cancel the order instead');

  const result = db
    .prepare('DELETE FROM order_items WHERE order_item_id = ? AND order_id = ?')
    .run(orderItemId, orderId);
  if (result.changes === 0) throw notFound('Order item not found');
  return getOrderWithItems(db, orderId);
}

export function updateOrderItemQuantity(db, orderId, orderItemId, quantity) {
  const order = getOrder(db, orderId);
  assertModifiable(order);
  if (!Number.isInteger(quantity) || quantity < 1) throw badRequest('Quantity must be a positive integer');

  const result = db
    .prepare('UPDATE order_items SET quantity = ? WHERE order_item_id = ? AND order_id = ?')
    .run(quantity, orderItemId, orderId);
  if (result.changes === 0) throw notFound('Order item not found');
  return getOrderWithItems(db, orderId);
}

// FR5: kitchen staff advance order status.
export function acceptOrder(db, orderId) {
  const order = getOrder(db, orderId);
  assertTransition(order, 'preparing');
  setOrderStatus(db, orderId, 'preparing');
  return getOrderWithItems(db, orderId);
}

export function markOrderReady(db, orderId) {
  const order = getOrder(db, orderId);
  assertTransition(order, 'ready');
  setOrderStatus(db, orderId, 'ready');
  return getOrderWithItems(db, orderId);
}

// FR2 (table status) + delivering the order to the table.
export function serveOrder(db, orderId) {
  const order = getOrder(db, orderId);
  assertTransition(order, 'served');
  setOrderStatus(db, orderId, 'served');
  return getOrderWithItems(db, orderId);
}

// FR14: waiter or manager cancels before the kitchen has it ready, with
// explicit confirmation (enforced at the route layer via a `confirm` flag).
export function cancelOrder(db, orderId) {
  const order = getOrder(db, orderId);
  if (!['pending', 'preparing'].includes(order.status)) {
    throw conflict(`Orders can only be cancelled while pending or preparing (current status: ${order.status})`);
  }
  const run = db.transaction(() => {
    setOrderStatus(db, orderId, 'cancelled');
    const stillActive = db
      .prepare(
        `SELECT COUNT(*) AS n FROM orders
         WHERE table_id = ? AND status NOT IN ('cancelled', 'closed')`
      )
      .get(order.table_id).n;
    if (stillActive === 0) setTableStatus(db, order.table_id, 'empty');
  });
  run();
  return getOrderWithItems(db, orderId);
}
