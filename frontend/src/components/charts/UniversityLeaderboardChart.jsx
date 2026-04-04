import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function trimLabel(name, max = 28) {
  if (!name || String(name).length <= max) return String(name ?? '');
  return `${String(name).slice(0, max - 1)}…`;
}

/**
 * @param {{ universities: Array<{ universityId: number, universityName: string, exchangeCount: number }>, loading: boolean, error: string }} props
 */
export function UniversityLeaderboardChart({ universities, loading, error }) {
  const chartData = useMemo(
    () =>
      (universities ?? []).map((u) => ({
        ...u,
        label: trimLabel(u.universityName),
      })),
    [universities]
  );

  const chartHeight = Math.min(480, Math.max(260, chartData.length * 40));

  if (loading) {
    return (
      <div className="report-chart">
        <h3 className="report-chart-title">Universities by exchange activity</h3>
        <p className="muted">Loading chart…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-chart">
        <h3 className="report-chart-title">Universities by exchange activity</h3>
        <p className="form-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="report-chart">
        <h3 className="report-chart-title">Universities by exchange activity</h3>
        <p className="muted">No data.</p>
      </div>
    );
  }

  return (
    <div className="report-chart report-chart--wide">
      <h3 className="report-chart-title">Top universities (exchanges)</h3>
      <div className="report-chart-recharts" style={{ minHeight: chartHeight }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart layout="vertical" data={chartData} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.35)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value) => [value, 'Exchanges']}
              labelFormatter={(_, p) => (p?.payload?.universityName ? String(p.payload.universityName) : '')}
              contentStyle={{ borderRadius: 8 }}
            />
            <Bar dataKey="exchangeCount" name="Exchanges" fill="#7950f2" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
