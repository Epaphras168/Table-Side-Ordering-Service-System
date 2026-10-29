import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import styles from './Waiter.module.css';

const PRESETS = ['Guest needs assistance', 'Order is taking too long', 'Spill / needs cleaning', 'Needs the manager'];

// FR7: waiter raises an urgent alert visible to kitchen & manager instantly.
export default function UrgentAlertModal({ tableNumber, onSend, onClose }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      await onSend(message.trim());
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title={`Urgent alert — Table ${tableNumber}`}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-danger" disabled={!message.trim() || sending} onClick={handleSend}>
            {sending ? 'Sending…' : 'Send alert'}
          </button>
        </>
      }
    >
      <div className={styles.alertPresets}>
        {PRESETS.map((preset) => (
          <button key={preset} type="button" className="btn btn-sm" onClick={() => setMessage(preset)}>
            {preset}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="alert-message">Message</label>
        <textarea
          id="alert-message"
          className="input"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe what's needed…"
          autoFocus
        />
      </div>
    </Modal>
  );
}
