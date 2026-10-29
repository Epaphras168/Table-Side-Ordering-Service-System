export default function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={28} style={{ marginBottom: 8, opacity: 0.6 }} />}
      {title && <h3>{title}</h3>}
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
