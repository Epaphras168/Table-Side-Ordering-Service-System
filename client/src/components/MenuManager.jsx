import { useEffect, useState } from 'react';
import { menuApi } from '../api/client';

const EMPTY_FORM = { name: '', category: '', price: '' };

export default function MenuManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  async function refresh() {
    setItems(await menuApi.list());
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await menuApi.create({
        name: form.name,
        category: form.category,
        price: Number(form.price),
      });
      setForm(EMPTY_FORM);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleAvailable(item) {
    await menuApi.update(item.item_id, { available: !item.available });
    await refresh();
  }

  async function handleRemove(item) {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return;
    await menuApi.remove(item.item_id);
    await refresh();
  }

  return (
    <section>
      <h2>Menu Management</h2>
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <form className="menu-item-form" onSubmit={handleSubmit}>
        <input
          placeholder="Item name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          required
        />
        <input
          type="number"
          min="0"
          step="1"
          placeholder="Price (RWF)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <button type="submit" className="primary">Add item</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Price (RWF)</th>
            <th>Available</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.item_id} className={item.available ? '' : 'unavailable'}>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.price.toLocaleString()}</td>
              <td>
                <button type="button" onClick={() => toggleAvailable(item)}>
                  {item.available ? 'Mark unavailable' : 'Mark available'}
                </button>
              </td>
              <td>
                <button type="button" className="danger" onClick={() => handleRemove(item)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5}>No menu items yet — add one above.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
