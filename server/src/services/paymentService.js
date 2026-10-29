import { randomUUID } from 'node:crypto';
import { badRequest, conflict } from '../utils/httpError.js';
import { getBill } from './billService.js';
import { setTableStatus } from './tableService.js';

const TOLERANCE = 0.5;

// FR10: payment by cash, card or mobile money; supports paying a whole
// bill in one go or settling it share-by-share after a split (FR8).
export function recordPayment(db, billId, { shareId, method, amount, recordedBy }) {
  const bill = getBill(db, billId);
  if (bill.status !== 'open') throw conflict('This bill is already settled');

  let share = null;
  if (shareId) {
    share = bill.shares.find((s) => s.share_id === shareId);
    if (!share) throw badRequest('Share not found on this bill');
    if (share.paid) throw conflict('This share has already been paid');
    if (Math.abs(amount - share.amount) > TOLERANCE) {
      throw badRequest(`Payment of ${amount} does not match the share amount of ${share.amount}`);
    }
  } else if (bill.shares.length > 0) {
    throw badRequest('This bill was split — pay each share individually via shareId');
  }

  const paymentId = randomUUID();
  const run = db.transaction(() => {
    db.prepare(
      'INSERT INTO payments (payment_id, bill_id, share_id, method, amount, recorded_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(paymentId, billId, shareId ?? null, method, amount, recordedBy);

    if (share) {
      db.prepare('UPDATE bill_shares SET paid = 1 WHERE share_id = ?').run(shareId);
    }

    const settled = isSettled(db, billId);
    if (settled) {
      settleBill(db, billId);
    }
  });
  run();

  return getBill(db, billId);
}

function isSettled(db, billId) {
  const shares = db.prepare('SELECT paid FROM bill_shares WHERE bill_id = ?').all(billId);
  if (shares.length > 0) return shares.every((s) => s.paid);

  const bill = db.prepare('SELECT total FROM bills WHERE bill_id = ?').get(billId);
  const paid = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE bill_id = ?')
    .get(billId).total;
  return paid >= bill.total - TOLERANCE;
}

// Paid --> Closed in 05_state.puml happens in the same step: nothing in
// the requirements needs a separate "paid but table still occupied" state.
function settleBill(db, billId) {
  db.prepare("UPDATE bills SET status = 'paid' WHERE bill_id = ?").run(billId);

  const orderIds = db.prepare('SELECT order_id FROM bill_orders WHERE bill_id = ?').all(billId).map((r) => r.order_id);
  const markClosed = db.prepare(
    `UPDATE orders SET status = 'closed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE order_id = ?`
  );
  for (const orderId of orderIds) markClosed.run(orderId);

  const tableIds = db.prepare('SELECT table_id FROM bill_tables WHERE bill_id = ?').all(billId).map((r) => r.table_id);
  for (const tableId of tableIds) {
    const stillActive = db
      .prepare(`SELECT COUNT(*) AS n FROM orders WHERE table_id = ? AND status NOT IN ('cancelled', 'closed')`)
      .get(tableId).n;
    if (stillActive === 0) setTableStatus(db, tableId, 'empty');
  }
}
