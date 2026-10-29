import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { tablesApi } from '../../api/resources';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { TABLE_STATUS_META } from '../../lib/statusMeta';
import styles from './Manager.module.css';

const EMPTY_FORM = { number: '', capacity: '' };

// FR1 (table management side): manager maintains the floor plan.
export default function TablesTab() {
  const [tables, setTables] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { notify } = useToast();

  function refresh() {
    tablesApi.list().then(setTables).catch(() => {});
  }

  useEffect(refresh, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await tablesApi.create({ number: Number(form.number), capacity: Number(form.capacity) });
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      notify('Could not add table', err.message, 'danger');
    }
  }

  async function handleRemove(table) {
    if (!window.confirm(`Remove table ${table.number}?`)) return;
    try {
      await tablesApi.remove(table.tableId);
      refresh();
    } catch (err) {
      notify('Could not remove table', err.message, 'danger');
    }
  }

  if (!tables) return null;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Tables</h1>
          <p className="muted">The floor plan available to waiters.</p>
        </div>
      </div>

      <form className={`card card-pad ${styles.formCard}`} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className="field">
            <label htmlFor="table-number">Table number</label>
            <input id="table-number" type="number" min="1" className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="table-capacity">Capacity</label>
            <input id="table-capacity" type="number" min="1" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary"><Plus size={15} /> Add table</button>
        </div>
      </form>

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Number</th><th>Capacity</th><th>Status</th><th>Active orders</th><th /></tr></thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.tableId}>
                <td>#{table.number}</td>
                <td>{table.capacity}</td>
                <td><StatusBadge meta={TABLE_STATUS_META[table.status]} /></td>
                <td>{table.activeOrders}</td>
                <td className="text-right">
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemove(table)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
