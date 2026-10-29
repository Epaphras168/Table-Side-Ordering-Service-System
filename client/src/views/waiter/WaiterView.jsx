import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { tablesApi } from '../../api/resources';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import { TABLE_STATUS_META } from '../../lib/statusMeta';
import TableDetail from './TableDetail';
import styles from './Waiter.module.css';

export default function WaiterView() {
  const [tables, setTables] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const { notify } = useToast();

  const refresh = useCallback(() => {
    tablesApi.list().then(setTables).catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  useRealtimeEvent('order:new', refresh);
  useRealtimeEvent('order:status', refresh);
  useRealtimeEvent('order:cancelled', refresh);
  useRealtimeEvent('table:freed', refresh);

  useRealtimeEvent(
    'notification:order_ready',
    useCallback(
      (payload) => {
        const table = tables?.find((t) => t.tableId === payload.order.table_id);
        notify('Order ready to serve', table ? `Table ${table.number}` : undefined, 'success', 8000);
        refresh();
      },
      [tables, notify, refresh]
    )
  );

  if (selectedTableId) {
    return (
      <TableDetail
        tableId={selectedTableId}
        onBack={() => {
          setSelectedTableId(null);
          refresh();
        }}
      />
    );
  }

  if (!tables) return <Spinner label="Loading tables…" />;

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 'var(--space-5)' }}>
        <h1>Tables</h1>
        <span className="muted">{tables.length} tables</span>
      </div>

      <div className={styles.grid}>
        {tables.map((table) => (
          <button
            key={table.tableId}
            type="button"
            className={styles.tableCard}
            onClick={() => setSelectedTableId(table.tableId)}
          >
            <div className={styles.tableNumber}>#{table.number}</div>
            <StatusBadge meta={TABLE_STATUS_META[table.status]} />
            <div className={styles.tableMeta}>
              <span className="row" style={{ gap: 4 }}>
                <Users size={13} /> {table.capacity} seats
              </span>
              {table.activeOrders > 0 && <div>{table.activeOrders} active order(s)</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
