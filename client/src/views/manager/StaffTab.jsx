import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { staffApi } from '../../api/resources';
import { useToast } from '../../context/ToastContext';
import styles from './Manager.module.css';

const EMPTY_FORM = { name: '', username: '', role: 'waiter', password: '' };

// FR13 / UC14: manager manages staff accounts and role-based access.
export default function StaffTab() {
  const [staff, setStaff] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { notify } = useToast();

  function refresh() {
    staffApi.list().then(setStaff).catch(() => {});
  }

  useEffect(refresh, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await staffApi.create(form);
      setForm(EMPTY_FORM);
      refresh();
      notify('Account created', `${form.username} can now sign in`, 'success');
    } catch (err) {
      notify('Could not create account', err.message, 'danger');
    }
  }

  async function toggleActive(member) {
    await staffApi.update(member.staffId, { active: !member.active });
    refresh();
  }

  if (!staff) return null;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Staff</h1>
          <p className="muted">Create accounts and manage who can sign in.</p>
        </div>
      </div>

      <form className={`card card-pad ${styles.formCard}`} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className="field">
            <label htmlFor="staff-name">Full name</label>
            <input id="staff-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="staff-username">Username</label>
            <input id="staff-username" className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="staff-role">Role</label>
            <select id="staff-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="waiter">Waiter</option>
              <option value="kitchen">Kitchen staff</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="staff-password">Temporary password</label>
            <input id="staff-password" type="password" minLength={6} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary"><Plus size={15} /> Create account</button>
        </div>
      </form>

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th /></tr></thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.staffId} className={member.active ? '' : 'is-dim'}>
                <td>{member.name}</td>
                <td className="mono">{member.username}</td>
                <td style={{ textTransform: 'capitalize' }}>{member.role}</td>
                <td><span className={`badge ${member.active ? 'badge-success' : 'badge-neutral'}`}>{member.active ? 'Active' : 'Deactivated'}</span></td>
                <td className="text-right">
                  <button type="button" className="btn btn-sm" onClick={() => toggleActive(member)}>
                    {member.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
