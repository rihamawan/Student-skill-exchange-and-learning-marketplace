import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function trimLabel(name, max = 24) {
  if (!name || String(name).length <= max) return String(name ?? '');
  return `${String(name).slice(0, max - 1)}…`;
}

/**
 * @param {{ skills: Array<{ skillId: number, skillName: string, offerCount: number, requestCount: number, exchangeCount: number }>, loading: boolean, error: string, scopeLabel?: string }} props
 */
export function TopSkillsChart({ skills, loading, error, scopeLabel }) {
  const chartData = useMemo(
    () =>
      (skills ?? []).map((s) => ({
        ...s,
        label: trimLabel(s.skillName),
      })),
    [skills]
  );

  const chartHeight = Math.min(520, Math.max(260, chartData.length * 42));

  if (loading) {
    return (
      <div className="report-chart">
        <h3 className="report-chart-title">Top skills (demand)</h3>
        <p className="muted">Loading chart…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-chart">
        <h3 className="report-chart-title">Top skills (demand)</h3>
        <p className="form-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="report-chart">
        <h3 className="report-chart-title">Top skills (demand)</h3>
        <p className="muted">No data.</p>
      </div>
    );
  }

  return (
    <div className="report-chart report-chart--wide">
      <h3 className="report-chart-title">Top skills (demand)</h3>
      {scopeLabel ? <p className="muted report-chart-sub">{scopeLabel}</p> : null}
      <div className="report-chart-recharts" style={{ minHeight: chartHeight }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart layout="vertical" data={chartData} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.35)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" width={108} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value, name) => [value, name]}
              labelFormatter={(_, p) => (p?.payload?.skillName ? String(p.payload.skillName) : '')}
              contentStyle={{ borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="offerCount" name="Offers" stackId="a" fill="#228be6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="requestCount" name="Requests" stackId="a" fill="#fab005" />
            <Bar dataKey="exchangeCount" name="Exchanges" stackId="a" fill="#12b886" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
