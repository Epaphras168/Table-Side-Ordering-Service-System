import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { menuApi } from '../../api/resources';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { formatMoney } from '../../lib/statusMeta';
import styles from './Manager.module.css';

const EMPTY_FORM = { name: '', category: '', price: '' };

// FR11: manager adds, edits and removes menu items and prices.
export default function MenuTab() {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { notify } = useToast();

  function refresh() {
    menuApi.list().then(setItems).catch(() => {});
  }

  useEffect(refresh, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await menuApi.create({ name: form.name, category: form.category, price: Number(form.price) });
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      notify('Could not add item', err.message, 'danger');
    }
  }

  async function toggleAvailable(item) {
    await menuApi.update(item.item_id, { available: !item.available });
    refresh();
  }

  async function handleRemove(item) {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return;
    const result = await menuApi.remove(item.item_id);
    notify(result.disabled ? 'Marked unavailable' : 'Removed', result.disabled ? 'Item is referenced by past orders, so it was disabled instead of deleted.' : undefined, 'info');
    refresh();
  }

  if (!items) return null;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Menu</h1>
          <p className="muted">Add, edit and retire dishes and prices.</p>
        </div>
      </div>

      <form className={`card card-pad ${styles.formCard}`} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className="field">
            <label htmlFor="item-name">Name</label>
            <input id="item-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="item-category">Category</label>
            <input id="item-category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="item-price">Price (RWF)</label>
            <input id="item-price" type="number" min="0" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary"><Plus size={15} /> Add item</button>
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState title="No menu items yet" message="Add your first dish above." />
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Category</th><th>Price</th><th>Available</th><th /></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.item_id} className={item.available ? '' : 'is-dim'}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td className="mono">{formatMoney(item.price)}</td>
                  <td>
                    <button type="button" className="btn btn-sm" onClick={() => toggleAvailable(item)}>
                      {item.available ? 'Mark unavailable' : 'Mark available'}
                    </button>
                  </td>
                  <td className="text-right">
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemove(item)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
