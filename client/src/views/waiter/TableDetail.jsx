import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Siren } from 'lucide-react';
import { billsApi, notificationsApi, ordersApi, tablesApi } from '../../api/resources';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import { TABLE_STATUS_META } from '../../lib/statusMeta';
import BillPanel from './BillPanel';
import OrderBuilder from './OrderBuilder';
import OrderCard from './OrderCard';
import UrgentAlertModal from './UrgentAlertModal';
import styles from './Waiter.module.css';

export default function TableDetail({ tableId, onBack }) {
  const [table, setTable] = useState(null);
  const [orders, setOrders] = useState(null);
  const [bill, setBill] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useToast();

  const refresh = useCallback(async () => {
    const [tableRes, ordersRes, billRes] = await Promise.all([
      tablesApi.get(tableId),
      ordersApi.list({ tableId }),
      billsApi.openForTable(tableId),
    ]);
    setTable(tableRes);
    setOrders(ordersRes.filter((o) => o.status !== 'closed'));
    // Once a bill is fully paid it's no longer "open" and this lookup
    // returns null; keep showing the settled bill rather than let a
    // same-tab or other-staff WS-triggered refresh blank it out.
    setBill((prev) => (prev?.status === 'paid' ? prev : billRes));
  }, [tableId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRealtimeEvent('order:new', refresh);
  useRealtimeEvent('order:updated', refresh);
  useRealtimeEvent('order:status', refresh);
  useRealtimeEvent('order:cancelled', refresh);
  useRealtimeEvent('bill:updated', refresh);
  useRealtimeEvent('table:freed', refresh);

  async function handleAction(promise, { onDone } = {}) {
    try {
      await promise;
      await refresh();
      onDone?.();
    } catch (err) {
      notify('Something went wrong', err.message, 'danger');
    }
  }

  // A fully-settled bill is no longer "open", so the usual refresh() (which
  // re-fetches the open bill for this table) would immediately make it
  // disappear. Show the settlement confirmation from the payment response
  // itself, and only quietly sync the table/orders in the background.
  async function handlePay(body) {
    try {
      const updated = await billsApi.pay(bill.bill_id, body);
      setBill(updated);
      notify('Payment recorded', updated.status === 'paid' ? 'Table freed' : undefined, 'success');
      if (updated.status === 'paid') {
        const [tableRes, ordersRes] = await Promise.all([tablesApi.get(tableId), ordersApi.list({ tableId })]);
        setTable(tableRes);
        setOrders(ordersRes.filter((o) => o.status !== 'closed'));
      }
    } catch (err) {
      notify('Payment failed', err.message, 'danger');
    }
  }

  if (!table || !orders) return <Spinner label="Loading table…" />;

  const hasBillableOrders = orders.some((o) => o.status === 'served');
  const canOrder = table.status !== 'awaiting_bill';

  return (
    <div>
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderLeft}>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onBack} aria-label="Back to tables">
            <ArrowLeft size={18} />
          </button>
          <h1>Table #{table.number}</h1>
          <StatusBadge meta={TABLE_STATUS_META[table.status]} />
        </div>
        <button type="button" className="btn btn-danger" onClick={() => setShowAlert(true)}>
          <Siren size={15} /> Urgent alert
        </button>
      </div>

      {table.status === 'empty' && (
        <div className="card card-pad" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="row-between">
            <p style={{ margin: 0 }}>This table is empty. Seat guests to start taking an order.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleAction(tablesApi.seat(tableId))}
            >
              Seat guests
            </button>
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}><h2>Orders</h2></div>
          {orders.map((order) => (
            <OrderCard
              key={order.order_id}
              order={order}
              onUpdateQty={(itemId, quantity) =>
                handleAction(
                  quantity > 0
                    ? ordersApi.updateItem(order.order_id, itemId, quantity)
                    : ordersApi.removeItem(order.order_id, itemId)
                )
              }
              onRemoveItem={(itemId) => handleAction(ordersApi.removeItem(order.order_id, itemId))}
              onServe={(orderId) => handleAction(ordersApi.serve(orderId))}
              onCancel={(orderId, reason) => handleAction(ordersApi.cancel(orderId, reason))}
            />
          ))}
        </div>
      )}

      {canOrder && table.status !== 'empty' && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}><h2>Add to order</h2></div>
          <OrderBuilder
            submitting={submitting}
            onSubmit={async (items) => {
              setSubmitting(true);
              try {
                await ordersApi.place({ tableId, items });
                await refresh();
              } catch (err) {
                notify('Could not send order', err.message, 'danger');
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </div>
      )}

      <div className={styles.section}>
        <BillPanel
          bill={bill}
          canRequestBill={hasBillableOrders}
          onGenerate={() => handleAction(billsApi.generate([tableId]))}
          onSplit={(body) => handleAction(billsApi.split(bill.bill_id, body))}
          onPay={handlePay}
        />
      </div>

      {showAlert && (
        <UrgentAlertModal
          tableNumber={table.number}
          onClose={() => setShowAlert(false)}
          onSend={(message) =>
            notificationsApi.urgentAlert(tableId, message).then(() => notify('Alert sent', 'The kitchen and manager were notified', 'success'))
          }
        />
      )}
    </div>
  );
}
