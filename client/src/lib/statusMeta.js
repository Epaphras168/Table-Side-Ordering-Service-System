export const ORDER_STATUS_META = {
  pending: { label: 'Pending', variant: 'neutral' },
  preparing: { label: 'Preparing', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  served: { label: 'Served', variant: 'info' },
  bill_requested: { label: 'Bill requested', variant: 'primary' },
  paid: { label: 'Paid', variant: 'success' },
  closed: { label: 'Closed', variant: 'neutral' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

export const TABLE_STATUS_META = {
  empty: { label: 'Empty', variant: 'neutral' },
  awaiting_order: { label: 'Awaiting order', variant: 'info' },
  occupied: { label: 'Occupied', variant: 'warning' },
  awaiting_bill: { label: 'Awaiting bill', variant: 'primary' },
};

export function formatMoney(amount) {
  return new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(amount ?? 0);
}

export function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
