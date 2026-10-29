import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reportsApi } from '../../api/resources';
import { formatMoney } from '../../lib/statusMeta';
import styles from './Manager.module.css';

const BAR_COLOR = '#c2410c';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card card-pad" style={{ padding: '8px 12px', boxShadow: 'var(--shadow-md)' }}>
      <div className="muted" style={{ fontSize: '0.78rem' }}>{label}</div>
      <strong>{formatMoney(payload[0].value)} RWF</strong>
    </div>
  );
}

// FR12/UC15: manager-facing sales report, aggregated from the payment log.
export default function ReportsTab() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    reportsApi.sales().then(setReport).catch(() => {});
  }, []);

  if (!report) return null;

  const maxMethod = Math.max(1, ...report.byMethod.map((m) => m.revenue));

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Sales reports</h1>
          <p className="muted">All-time revenue, from the payment and order log.</p>
        </div>
      </div>

      <div className={styles.statGrid}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Revenue</div>
          <div className={styles.statValue}>{formatMoney(report.revenue)} RWF</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Orders closed</div>
          <div className={styles.statValue}>{report.orderCount}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Avg. order value</div>
          <div className={styles.statValue}>{formatMoney(report.averageOrderValue)}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Cancelled orders</div>
          <div className={styles.statValue}>{report.cancelledCount}</div>
        </div>
      </div>

      <div className={`card ${styles.chartCard}`}>
        <h3>Revenue by day</h3>
        {report.byDay.length === 0 ? (
          <p className="muted">No payments recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.byDay} barCategoryGap={18}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-alt)' }} />
              <Bar dataKey="revenue" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="row wrap" style={{ gap: 'var(--space-5)', alignItems: 'flex-start' }}>
        <div className="card card-pad" style={{ flex: '1 1 300px' }}>
          <h3>By payment method</h3>
          <div className="stack">
            {report.byMethod.map((m) => (
              <div key={m.method}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize' }}>{m.method.replace('_', ' ')}</span>
                  <span className="mono">{formatMoney(m.revenue)}</span>
                </div>
                <div style={{ background: 'var(--color-surface-alt)', borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${(m.revenue / maxMethod) * 100}%`, background: BAR_COLOR, height: 6, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad" style={{ flex: '1 1 300px' }}>
          <h3>Top items</h3>
          <table className="data-table">
            <thead><tr><th>Item</th><th>Units</th><th>Revenue</th></tr></thead>
            <tbody>
              {report.topItems.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.unitsSold}</td>
                  <td className="mono">{formatMoney(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
