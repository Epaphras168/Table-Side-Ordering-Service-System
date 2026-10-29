export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="page-loading">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
