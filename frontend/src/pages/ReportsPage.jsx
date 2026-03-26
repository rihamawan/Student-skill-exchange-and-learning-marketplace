import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SimpleBarChart } from '../components/charts/SimpleBarChart';

/**
 * @param {{ scope: 'admin' | 'superadmin' }} props
 */
export function ReportsPage({ scope }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api('/api/v1/reports');
        if (!cancelled) setData(res.data ?? null);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load reports');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const title = scope === 'superadmin' ? 'Platform reports' : 'University reports';
  const subtitle =
    scope === 'superadmin'
      ? 'Platform-wide totals including payments.'
      : 'Statistics for your university, including payment aggregates.';

  if (loading) {
    return (
      <div>
        <h1>{title}</h1>
        <p className="muted">Loading report data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>{title}</h1>
        <p className="form-error" role="alert">
          {error}
        </p>
        <p className="muted">Ensure you are signed in as admin or superadmin and the API is running.</p>
      </div>
    );
  }

  if (!data || typeof data !== 'object') {
    return (
      <div>
        <h1>{title}</h1>
        <p className="muted">No report data returned.</p>
      </div>
    );
  }

  const isSuper = scope === 'superadmin';

  const superValues = [
    data.totalUsers,
    data.totalStudents,
    data.totalExchanges,
    data.totalPayments,
    data.totalUniversities,
    data.totalAdmins,
  ];

  const money = (n) =>
    typeof n === 'number'
      ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
      : String(n);

  return (
    <div className="reports-page">
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>

      <div className="report-cards">
        {isSuper ? (
          <>
            <div className="report-stat-card">
              <span className="report-stat-label">Total users</span>
              <span className="report-stat-num">{data.totalUsers ?? '—'}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Total students</span>
              <span className="report-stat-num">{data.totalStudents ?? '—'}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Total exchanges</span>
              <span className="report-stat-num">{data.totalExchanges ?? '—'}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Total payments</span>
              <span className="report-stat-num">{data.totalPayments ?? '—'}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Payment volume</span>
              <span className="report-stat-num">{money(data.totalPaymentAmount)}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Universities</span>
              <span className="report-stat-num">{data.totalUniversities ?? '—'}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Admins</span>
              <span className="report-stat-num">{data.totalAdmins ?? '—'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="report-stat-card">
              <span className="report-stat-label">Students (your university)</span>
              <span className="report-stat-num">{data.totalStudents ?? '—'}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Exchanges (your university)</span>
              <span className="report-stat-num">{data.totalExchanges ?? '—'}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Payments (your university)</span>
              <span className="report-stat-num">{data.totalPayments ?? '—'}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Payment total (your university)</span>
              <span className="report-stat-num">{money(data.totalPaymentAmount)}</span>
            </div>
          </>
        )}
      </div>

      <div className="report-charts">
        {isSuper ? (
          <SimpleBarChart
            title="Platform overview (counts)"
            labels={['Users', 'Students', 'Exchanges', 'Payments', 'Universities', 'Admins']}
            values={superValues}
          />
        ) : (
          <SimpleBarChart
            title="Your university (counts except payment total)"
            labels={['Students', 'Exchanges', 'Payments']}
            values={[data.totalStudents, data.totalExchanges, data.totalPayments]}
          />
        )}
        {isSuper ? (
          <SimpleBarChart title="Payment amount (platform)" labels={['Total paid']} values={[data.totalPaymentAmount]} formatValue={money} />
        ) : (
          <SimpleBarChart
            title="Payment amount (your university)"
            labels={['Total paid']}
            values={[data.totalPaymentAmount]}
            formatValue={money}
          />
        )}
      </div>
    </div>
  );
}
