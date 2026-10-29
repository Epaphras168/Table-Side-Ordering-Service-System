import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { ORDER_STATUS_META, formatMoney, formatTime } from '../../lib/statusMeta';
import styles from './Waiter.module.css';

export default function OrderCard({ order, onUpdateQty, onRemoveItem, onServe, onCancel }) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  const total = order.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const canModify = order.status === 'pending';
  const canCancel = order.status === 'pending' || order.status === 'preparing';

  return (
    <div className={styles.orderCard}>
      <div className={styles.orderCardHeader}>
        <div className="row" style={{ gap: 10 }}>
          <strong>Round at {formatTime(order.created_at)}</strong>
          <StatusBadge meta={ORDER_STATUS_META[order.status]} />
        </div>
        <span className="mono muted">{formatMoney(total)} RWF</span>
      </div>

      {order.items.map((item) => (
        <div key={item.order_item_id} className={styles.itemLine}>
          <span>{item.name}{item.notes ? ` — ${item.notes}` : ''}</span>
          {canModify ? (
            <div className={styles.qtyControl}>
              <button type="button" className="btn btn-sm" onClick={() => onUpdateQty(item.order_item_id, item.quantity - 1)} disabled={item.quantity <= 1}>
                <Minus size={12} />
              </button>
              <span className="mono">{item.quantity}</span>
              <button type="button" className="btn btn-sm" onClick={() => onUpdateQty(item.order_item_id, item.quantity + 1)}>
                <Plus size={12} />
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => onRemoveItem(item.order_item_id)} aria-label="Remove item">
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <span className="mono">× {item.quantity}</span>
          )}
        </div>
      ))}

      <div className="row-between" style={{ marginTop: 'var(--space-3)' }}>
        {order.status === 'ready' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onServe(order.order_id)}>
            Mark served
          </button>
        )}
        {canCancel && !cancelling && (
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setCancelling(true)}>
            Cancel order
          </button>
        )}
      </div>

      {cancelling && (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          <div className="field">
            <label>Reason (optional)</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. guest changed their mind" />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-sm" onClick={() => setCancelling(false)}>Never mind</button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                onCancel(order.order_id, reason);
                setCancelling(false);
              }}
            >
              Confirm cancellation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
