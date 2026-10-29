import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import styles from './Kitchen.module.css';

const OVERDUE_MS = 12 * 60 * 1000;

function elapsedLabel(createdAt) {
  const created = new Date(createdAt.endsWith('Z') ? createdAt : `${createdAt}Z`).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - created) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return { label: `${mins}:${String(secs).padStart(2, '0')}`, ms: seconds * 1000 };
}

export default function TicketCard({ order, tableNumber, onAdvance }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { label, ms } = elapsedLabel(order.created_at);
  const overdue = ms > OVERDUE_MS && order.status !== 'ready';
  const nextAction =
    order.status === 'pending'
      ? { label: 'Start preparing', icon: ArrowRight, status: 'accept' }
      : order.status === 'preparing'
        ? { label: 'Mark ready', icon: CheckCircle2, status: 'ready' }
        : null;

  return (
    <div className={`${styles.ticket} ${overdue ? styles.ticketOverdue : ''}`}>
      <div className={styles.ticketHeader}>
        <span className={styles.ticketTable}>Table #{tableNumber ?? '—'}</span>
        <span className={styles.ticketTimer} style={overdue ? { color: 'var(--color-danger)' } : undefined}>{label}</span>
      </div>
      <div className={styles.ticketItems}>
        {order.items.map((item) => (
          <div key={item.order_item_id} className={styles.ticketItem}>
            <span>{item.name}{item.notes ? ` (${item.notes})` : ''}</span>
            <span className="mono">× {item.quantity}</span>
          </div>
        ))}
      </div>
      {nextAction ? (
        <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => onAdvance(order.order_id, nextAction.status)}>
          <nextAction.icon size={14} /> {nextAction.label}
        </button>
      ) : (
        <span className="badge badge-success" style={{ width: '100%', justifyContent: 'center' }}>Waiting for waiter</span>
      )}
    </div>
  );
}
