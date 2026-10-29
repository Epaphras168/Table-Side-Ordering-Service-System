// FR12/UC15: sales reporting, aggregated from the payment and order log.
export function salesReport(db, { from, to } = {}) {
  const start = from ?? '0000-01-01';
  const end = to ?? '9999-12-31';

  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(*) AS paymentCount
       FROM payments WHERE timestamp BETWEEN ? AND ?`
    )
    .get(start, end);

  const byMethod = db
    .prepare(
      `SELECT method, COALESCE(SUM(amount), 0) AS revenue, COUNT(*) AS count
       FROM payments WHERE timestamp BETWEEN ? AND ? GROUP BY method`
    )
    .all(start, end);

  const byDay = db
    .prepare(
      `SELECT substr(timestamp, 1, 10) AS day, COALESCE(SUM(amount), 0) AS revenue
       FROM payments WHERE timestamp BETWEEN ? AND ? GROUP BY day ORDER BY day`
    )
    .all(start, end);

  const byCategory = db
    .prepare(
      `SELECT mi.category, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue, SUM(oi.quantity) AS unitsSold
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN menu_items mi ON mi.item_id = oi.item_id
       WHERE o.status = 'closed' AND o.updated_at BETWEEN ? AND ?
       GROUP BY mi.category ORDER BY revenue DESC`
    )
    .all(start, end);

  const topItems = db
    .prepare(
      `SELECT mi.name, SUM(oi.quantity) AS unitsSold, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN menu_items mi ON mi.item_id = oi.item_id
       WHERE o.status = 'closed' AND o.updated_at BETWEEN ? AND ?
       GROUP BY mi.item_id ORDER BY revenue DESC LIMIT 10`
    )
    .all(start, end);

  const orderCount = db
    .prepare(`SELECT COUNT(*) AS n FROM orders WHERE status = 'closed' AND updated_at BETWEEN ? AND ?`)
    .get(start, end).n;

  const cancelledCount = db
    .prepare(`SELECT COUNT(*) AS n FROM orders WHERE status = 'cancelled' AND updated_at BETWEEN ? AND ?`)
    .get(start, end).n;

  return {
    range: { from: start, to: end },
    revenue: totals.revenue,
    paymentCount: totals.paymentCount,
    orderCount,
    cancelledCount,
    averageOrderValue: orderCount > 0 ? Math.round((totals.revenue / orderCount) * 100) / 100 : 0,
    byMethod,
    byDay,
    byCategory,
    topItems,
  };
}
