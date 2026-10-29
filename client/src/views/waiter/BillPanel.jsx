import { useState } from 'react';
import { CheckCircle2, Receipt } from 'lucide-react';
import { formatMoney } from '../../lib/statusMeta';
import styles from './Waiter.module.css';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

// FR8/FR9/FR10: itemized bill, split into shares, payment by any method.
export default function BillPanel({ bill, canRequestBill, onGenerate, onSplit, onPay }) {
  const [parts, setParts] = useState(2);
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);

  if (!bill) {
    if (!canRequestBill) return null;
    return (
      <div className="card card-pad">
        <div className="row-between">
          <div>
            <h3>Ready for the bill?</h3>
            <p className="muted">Generates an itemized bill for every served order at this table.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={onGenerate}>
            <Receipt size={15} /> Request bill
          </button>
        </div>
      </div>
    );
  }

  if (bill.status === 'paid') {
    return (
      <div className="card card-pad">
        <div className="row" style={{ color: 'var(--color-success)' }}>
          <CheckCircle2 size={18} /> <strong>Bill settled — table freed</strong>
        </div>
      </div>
    );
  }

  async function handlePayFull() {
    setBusy(true);
    try {
      await onPay({ method, amount: bill.balance });
    } finally {
      setBusy(false);
    }
  }

  async function handlePayShare(share) {
    setBusy(true);
    try {
      await onPay({ shareId: share.share_id, method, amount: share.amount });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad">
      <h3>Bill</h3>

      <div className="stack" style={{ marginBottom: 'var(--space-4)' }}>
        {bill.items.map((item, i) => (
          <div key={i} className={styles.itemLine}>
            <span>{item.quantity} × {item.name}</span>
            <span className="mono">{formatMoney(item.quantity * item.unit_price)}</span>
          </div>
        ))}
      </div>

      <div className={styles.billTotals}>
        <div className={styles.billTotalRow}><span className="muted">Subtotal</span><span className="mono">{formatMoney(bill.subtotal)}</span></div>
        <div className={styles.billTotalRow}><span className="muted">Tax</span><span className="mono">{formatMoney(bill.tax)}</span></div>
        <div className={styles.billTotalRow}><span className="muted">Service charge</span><span className="mono">{formatMoney(bill.service_charge)}</span></div>
        <div className={`${styles.billTotalRow} grand`}><span>Total</span><span className="mono">{formatMoney(bill.total)} RWF</span></div>
      </div>

      <div className="field" style={{ margin: 'var(--space-4) 0' }}>
        <label htmlFor="pay-method">Payment method</label>
        <select id="pay-method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {bill.shares.length === 0 ? (
        <div className="row-between" style={{ marginTop: 'var(--space-3)' }}>
          <div className="input-row">
            <input
              type="number"
              min={2}
              className="input"
              style={{ width: 90 }}
              value={parts}
              onChange={(e) => setParts(Number(e.target.value))}
            />
            <button type="button" className="btn" onClick={() => onSplit({ parts })}>
              Split into {parts}
            </button>
          </div>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={handlePayFull}>
            Pay full ({formatMoney(bill.balance)})
          </button>
        </div>
      ) : (
        <div>
          {bill.shares.map((share) => (
            <div key={share.share_id} className={styles.shareRow}>
              <span>{share.label} — <span className="mono">{formatMoney(share.amount)}</span></span>
              {share.paid ? (
                <span className="badge badge-success">Paid</span>
              ) : (
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => handlePayShare(share)}>
                  Mark paid
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
