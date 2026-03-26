/**
 * Horizontal bar row for numeric report fields. labels[i] pairs with values[i].
 */
export function SimpleBarChart({ title, labels, values, formatValue }) {
  const nums = values.map((v) => Number(v) || 0);
  const max = Math.max(1, ...nums);
  const fmt = formatValue ?? ((n) => String(n));

  return (
    <div className="report-chart">
      {title ? <h3 className="report-chart-title">{title}</h3> : null}
      <ul className="report-bar-list">
        {labels.map((label, i) => (
          <li key={label} className="report-bar-row">
            <span className="report-bar-label">{label}</span>
            <div className="report-bar-track">
              <div
                className="report-bar-fill"
                style={{ width: `${(nums[i] / max) * 100}%` }}
                title={fmt(nums[i])}
              />
            </div>
            <span className="report-bar-value">{fmt(nums[i])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
