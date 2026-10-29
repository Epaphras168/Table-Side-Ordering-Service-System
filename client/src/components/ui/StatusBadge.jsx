export default function StatusBadge({ meta }) {
  if (!meta) return null;
  return (
    <span className={`badge badge-${meta.variant}`}>
      <span className="badge-dot" />
      {meta.label}
    </span>
  );
}
