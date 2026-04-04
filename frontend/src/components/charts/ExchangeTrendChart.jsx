import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * @param {{ title: string, series: Array<{ period: string, exchangeCount: number }>, loading: boolean, error: string, scopeLabel?: string }} props
 */
export function ExchangeTrendChart({ title, series, loading, error, scopeLabel }) {
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
          <BarChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.35)" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
            <Tooltip
              formatter={(value) => [value, 'Exchanges']}
              labelFormatter={(label) => `Month ${label}`}
              contentStyle={{ borderRadius: 8 }}
            />
            <Bar dataKey="exchangeCount" name="Exchanges" fill="#12b886" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
