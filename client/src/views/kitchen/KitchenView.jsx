import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ordersApi, tablesApi } from '../../api/resources';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import TicketCard from './TicketCard';
import styles from './Kitchen.module.css';

const COLUMNS = [
  { status: 'pending', label: 'New orders' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready to serve' },
];

export default function KitchenView() {
  const [orders, setOrders] = useState(null);
  const [tableNumbers, setTableNumbers] = useState(new Map());
  const [alerts, setAlerts] = useState([]);

  const refresh = useCallback(() => {
    ordersApi.list({ status: 'pending,preparing,ready' }).then(setOrders).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    tablesApi.list().then((tables) => setTableNumbers(new Map(tables.map((t) => [t.tableId, t.number]))));
  }, [refresh]);

  useRealtimeEvent('order:new', refresh);
  useRealtimeEvent('order:updated', refresh);
  useRealtimeEvent('order:status', refresh);
  useRealtimeEvent('order:cancelled', refresh);

  useRealtimeEvent(
    'notification:urgent_alert',
    useCallback((payload) => setAlerts((prev) => [...prev, payload]), [])
  );

  async function handleAdvance(orderId, action) {
    const call = action === 'accept' ? ordersApi.accept(orderId) : ordersApi.ready(orderId);
    await call;
    refresh();
  }

  const grouped = useMemo(() => {
    const map = { pending: [], preparing: [], ready: [] };
    orders?.forEach((o) => map[o.status]?.push(o));
    return map;
  }, [orders]);

  if (!orders) return <Spinner label="Loading kitchen display…" />;

  return (
    <div>
      {alerts.map((alert, i) => (
        <div key={i} className={styles.alertBanner}>
          <span className="row" style={{ gap: 8 }}>
            <AlertTriangle size={18} /> <strong>Table {alert.tableNumber}:</strong> {alert.message}
          </span>
          <button type="button" className="btn btn-sm" onClick={() => setAlerts((prev) => prev.filter((_, idx) => idx !== i))}>
            Dismiss
          </button>
        </div>
      ))}

      <div className="row-between" style={{ marginBottom: 'var(--space-5)' }}>
        <h1>Kitchen display</h1>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="All caught up" message="No active orders right now." />
      ) : (
        <div className={styles.board}>
          {COLUMNS.map((col) => (
            <div key={col.status} className={styles.column}>
              <div className={styles.columnHeader}>
                <h2 style={{ margin: 0 }}>{col.label}</h2>
                <span className={styles.columnCount}>{grouped[col.status].length}</span>
              </div>
              {grouped[col.status].map((order) => (
                <TicketCard
                  key={order.order_id}
                  order={order}
                  tableNumber={tableNumbers.get(order.table_id)}
                  onAdvance={handleAdvance}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
