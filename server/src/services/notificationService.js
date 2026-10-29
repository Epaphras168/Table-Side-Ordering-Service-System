import { randomUUID } from 'node:crypto';

// FR12: every notification is logged with a timestamp for reporting.
export function createNotification(db, { orderId = null, tableId = null, type, message, raisedBy = null }) {
  const notificationId = randomUUID();
  db.prepare(
    'INSERT INTO notifications (notification_id, order_id, table_id, type, message, raised_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(notificationId, orderId, tableId, type, message, raisedBy);
  return db.prepare('SELECT * FROM notifications WHERE notification_id = ?').get(notificationId);
}

export function listNotifications(db, { limit = 100 } = {}) {
  return db
    .prepare('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT ?')
    .all(limit);
}
