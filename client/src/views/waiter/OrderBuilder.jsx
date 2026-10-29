import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Send } from 'lucide-react';
import { menuApi } from '../../api/resources';
import { formatMoney } from '../../lib/statusMeta';
import styles from './Waiter.module.css';

// FR2/FR3: browse the menu by category, build a cart, and submit it as a
// new order — editing the cart here is "before submitting to the kitchen".
export default function OrderBuilder({ onSubmit, submitting }) {
  const [menu, setMenu] = useState(null);
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState(new Map()); // itemId -> { item, quantity }

  useEffect(() => {
    menuApi.list().then(setMenu).catch(() => {});
  }, []);

  const categories = useMemo(() => {
    if (!menu) return [];
    return ['All', ...new Set(menu.map((m) => m.category))];
  }, [menu]);

  const visibleItems = useMemo(() => {
    if (!menu) return [];
    return category === 'All' ? menu : menu.filter((m) => m.category === category);
  }, [menu, category]);

  function adjustQty(item, delta) {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(item.item_id)?.quantity ?? 0;
      const quantity = current + delta;
      if (quantity <= 0) next.delete(item.item_id);
      else next.set(item.item_id, { item, quantity });
      return next;
    });
  }

  const cartItems = [...cart.values()];
  const cartTotal = cartItems.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);

  async function handleSubmit() {
    await onSubmit(cartItems.map(({ item, quantity }) => ({ itemId: item.item_id, quantity })));
    setCart(new Map());
  }

  if (!menu) return <p className="muted">Loading menu…</p>;

  return (
    <div>
      <div className={styles.categoryTabs}>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.categoryTab} ${category === c ? styles.categoryTabActive : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className={styles.menuGrid}>
        {visibleItems.map((item) => {
          const inCart = cart.get(item.item_id)?.quantity ?? 0;
          return (
            <div key={item.item_id} className={`${styles.menuItemCard} ${!item.available ? styles.unavailable : ''}`}>
              <div className={styles.menuItemTop}>
                <span>{item.name}</span>
                <span className="mono">{formatMoney(item.price)}</span>
              </div>
              {!item.available ? (
                <span className="faint" style={{ fontSize: '0.78rem' }}>Unavailable</span>
              ) : (
                <div className={styles.qtyControl}>
                  <button type="button" className="btn btn-sm" aria-label={`Remove one ${item.name}`} onClick={() => adjustQty(item, -1)} disabled={!inCart}>
                    <Minus size={13} />
                  </button>
                  <span className="mono" style={{ minWidth: 18, textAlign: 'center' }}>{inCart}</span>
                  <button type="button" className="btn btn-sm" aria-label={`Add ${item.name}`} onClick={() => adjustQty(item, 1)}>
                    <Plus size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cartItems.length > 0 && (
        <div className="card card-pad" style={{ marginTop: 'var(--space-4)' }}>
          <h3>New round</h3>
          {cartItems.map(({ item, quantity }) => (
            <div key={item.item_id} className={styles.cartRow}>
              <span>{quantity} × {item.name}</span>
              <span className="mono">{formatMoney(item.price * quantity)}</span>
            </div>
          ))}
          <div className="row-between" style={{ marginTop: 'var(--space-3)' }}>
            <strong>Total: {formatMoney(cartTotal)} RWF</strong>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              <Send size={14} /> {submitting ? 'Sending…' : 'Send to kitchen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
