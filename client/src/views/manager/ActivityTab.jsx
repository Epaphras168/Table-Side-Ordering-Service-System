import { useEffect, useState } from 'react';
import { notificationsApi } from '../../api/resources';
import EmptyState from '../../components/ui/EmptyState';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import styles from './Manager.module.css';

const TYPE_BADGE = {
  order_ready: 'badge-success',
  urgent_alert: 'badge-danger',
  cancellation: 'badge-warning',
};

// FR12: every order, transaction and notification is logged with a timestamp.
export default function ActivityTab() {
  const [notifications, setNotifications] = useState(null);

  function refresh() {
    notificationsApi.list(200).then(setNotifications).catch(() => {});
  }

  useEffect(refresh, []);
  useRealtimeEvent('notification:urgent_alert', refresh);
  useRealtimeEvent('notification:order_ready', refresh);
  useRealtimeEvent('notification:cancellation', refresh);

  if (!notifications) return null;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Activity log</h1>
          <p className="muted">Every alert, ready notification and cancellation, timestamped.</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="Nothing logged yet" />
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Time</th><th>Type</th><th>Message</th></tr></thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.notification_id}>
                  <td className="mono muted">{new Date(`${n.timestamp}Z`).toLocaleString()}</td>
                  <td><span className={`badge ${TYPE_BADGE[n.type] ?? 'badge-neutral'}`}>{n.type.replace('_', ' ')}</span></td>
                  <td>{n.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
