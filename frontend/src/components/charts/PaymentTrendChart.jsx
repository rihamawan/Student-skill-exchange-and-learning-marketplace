import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function formatPkr(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return String(n ?? '');
  return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 });
}

function compactNumber(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '';
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(Math.round(n));
}

/**
 * @param {{ title: string, series: Array<{ period: string, totalAmount: number, paymentCount: number }>, loading: boolean, error: string, scopeLabel?: string }} props
 */
export function PaymentTrendChart({ title, series, loading, error, scopeLabel }) {
  if (loading) {
    return (
      <div className="report-chart">
        <h3 className="report-chart-title">{title}</h3>
        <p className="muted">Loading chart…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-chart">
        <h3 className="report-chart-title">{title}</h3>
        <p className="form-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!series.length) {
    return (
      <div className="report-chart">
        <h3 className="report-chart-title">{title}</h3>
        <p className="muted">No data.</p>
      </div>
    );
  }

  return (
    <div className="report-chart">
      <h3 className="report-chart-title">{title}</h3>
      {scopeLabel ? <p className="muted report-chart-sub">{scopeLabel}</p> : null}
      <div className="report-chart-recharts">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.35)" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={compactNumber} width={44} />
            <Tooltip
              formatter={(value) => [formatPkr(Number(value)), 'Amount']}
              labelFormatter={(label) => `Month ${label}`}
              contentStyle={{ borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="totalAmount"
              name="Amount (PKR)"
              stroke="#228be6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#228be6' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
