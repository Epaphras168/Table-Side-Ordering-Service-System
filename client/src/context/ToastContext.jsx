import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (title, message, variant = 'info', duration = 5000) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, title, message, variant }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant] ?? Info;
          return (
            <div key={t.id} className={`toast toast-${t.variant}`}>
              <Icon size={18} aria-hidden="true" />
              <div className="toast-body">
                {t.title && <div className="toast-title">{t.title}</div>}
                {t.message && <div className="toast-message">{t.message}</div>}
              </div>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <XCircle size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
