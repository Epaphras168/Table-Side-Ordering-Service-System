import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { setTableStatus } from './tableService.js';

const ROUNDING_TOLERANCE = 0.5; // RWF has no sub-unit in practice; tolerate rounding drift.

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function getBill(db, billId) {
  const bill = db.prepare('SELECT * FROM bills WHERE bill_id = ?').get(billId);
  if (!bill) throw notFound('Bill not found');
  return hydrateBill(db, bill);
}

function hydrateBill(db, bill) {
  const tables = db
    .prepare(
      `SELECT rt.table_id, rt.number FROM bill_tables bt
       JOIN restaurant_tables rt ON rt.table_id = bt.table_id
       WHERE bt.bill_id = ?`
    )
    .all(bill.bill_id);
  const orders = db
    .prepare(
      `SELECT o.*, (
         SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
         FROM order_items oi WHERE oi.order_id = o.order_id
       ) AS order_total
       FROM bill_orders bo JOIN orders o ON o.order_id = bo.order_id
       WHERE bo.bill_id = ?`
    )
    .all(bill.bill_id);
  const items = db
    .prepare(
      `SELECT oi.item_id, mi.name, oi.quantity, oi.unit_price
       FROM bill_orders bo
       JOIN order_items oi ON oi.order_id = bo.order_id
       JOIN menu_items mi ON mi.item_id = oi.item_id
       WHERE bo.bill_id = ?`
    )
    .all(bill.bill_id);
  const shares = db.prepare('SELECT * FROM bill_shares WHERE bill_id = ?').all(bill.bill_id);
  const payments = db.prepare('SELECT * FROM payments WHERE bill_id = ?').all(bill.bill_id);
  const paidTotal = round2(payments.reduce((sum, p) => sum + p.amount, 0));

  return {
    ...bill,
    tables,
    orders,
    items,
    shares,
    payments,
    paidTotal,
    balance: round2(bill.total - paidTotal),
  };
}

// FR8/FR9: a bill is generated for one table, or several at once (a merge),
// covering every served-but-not-yet-billed order at those tables.
export function generateBill(db, { tableIds, createdBy }) {
  if (!tableIds?.length) throw badRequest('At least one table is required');

  const placeholders = tableIds.map(() => '?').join(',');
  const eligibleOrders = db
    .prepare(`SELECT * FROM orders WHERE table_id IN (${placeholders}) AND status = 'served'`)
    .all(...tableIds);

  if (eligibleOrders.length === 0) {
    throw badRequest('No served orders are ready to bill at the selected table(s)');
  }

  const orderIds = eligibleOrders.map((o) => o.order_id);
  const subtotalRow = db
    .prepare(
      `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS subtotal
       FROM order_items oi WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})`
    )
    .get(...orderIds);

  const subtotal = round2(subtotalRow.subtotal);
  const tax = round2(subtotal * config.taxRate);
  const serviceCharge = round2(subtotal * config.serviceChargeRate);
  const total = round2(subtotal + tax + serviceCharge);

  const billId = randomUUID();
  const run = db.transaction(() => {
    db.prepare(
      'INSERT INTO bills (bill_id, subtotal, tax, service_charge, total, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(billId, subtotal, tax, serviceCharge, total, createdBy);

    const insertBillTable = db.prepare('INSERT INTO bill_tables (bill_id, table_id) VALUES (?, ?)');
    for (const tableId of tableIds) insertBillTable.run(billId, tableId);

    const insertBillOrder = db.prepare('INSERT INTO bill_orders (bill_id, order_id) VALUES (?, ?)');
    const markBilled = db.prepare(
      `UPDATE orders SET status = 'bill_requested', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE order_id = ?`
    );
    for (const orderId of orderIds) {
      insertBillOrder.run(billId, orderId);
      markBilled.run(orderId);
    }

    for (const tableId of tableIds) setTableStatus(db, tableId, 'awaiting_bill');
  });
  run();

  return getBill(db, billId);
}

// FR8: split a bill into even or custom per-guest shares.
export function splitBill(db, billId, { parts, amounts, labels }) {
  const bill = getBill(db, billId);
  if (bill.status !== 'open') throw conflict('Only an open bill can be split');
  if (bill.payments.length > 0) throw conflict('Cannot re-split a bill that already has payments recorded');

  let shareAmounts;
  if (amounts?.length) {
    const sum = round2(amounts.reduce((a, b) => a + b, 0));
    if (Math.abs(sum - bill.total) > ROUNDING_TOLERANCE) {
      throw badRequest(`Share amounts (${sum}) must add up to the bill total (${bill.total})`);
    }
    shareAmounts = amounts;
  } else if (parts && parts > 1) {
    const even = Math.floor((bill.total / parts) * 100) / 100;
    shareAmounts = Array.from({ length: parts }, () => even);
    shareAmounts[shareAmounts.length - 1] = round2(bill.total - even * (parts - 1));
  } else {
    throw badRequest('Provide either "parts" (>= 2) or an explicit "amounts" array');
  }

  const run = db.transaction(() => {
    db.prepare('DELETE FROM bill_shares WHERE bill_id = ?').run(billId);
    const insert = db.prepare('INSERT INTO bill_shares (share_id, bill_id, label, amount) VALUES (?, ?, ?, ?)');
    shareAmounts.forEach((amount, i) => {
      insert.run(randomUUID(), billId, labels?.[i] ?? `Guest ${i + 1}`, amount);
    });
  });
  run();

  return getBill(db, billId);
}

export function getOpenBillForTable(db, tableId) {
  const row = db
    .prepare(
      `SELECT b.* FROM bills b
       JOIN bill_tables bt ON bt.bill_id = b.bill_id
       WHERE bt.table_id = ? AND b.status = 'open'
       ORDER BY b.created_at DESC LIMIT 1`
    )
    .get(tableId);
  return row ? hydrateBill(db, row) : null;
}
