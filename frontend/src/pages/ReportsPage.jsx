import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';
import { ExchangeTrendChart } from '../components/charts/ExchangeTrendChart';
import { PaymentTrendChart } from '../components/charts/PaymentTrendChart';
import { TopSkillsChart } from '../components/charts/TopSkillsChart';
import { UniversityLeaderboardChart } from '../components/charts/UniversityLeaderboardChart';
import { useReportExchangeTrend } from '../hooks/useReportExchangeTrend';
import { useReportPaymentTrend } from '../hooks/useReportPaymentTrend';
import { useReportTopSkills } from '../hooks/useReportTopSkills';
import { useReportUniversityLeaderboard } from '../hooks/useReportUniversityLeaderboard';

/**
 * @param {{ scope: 'admin' | 'superadmin' }} props
 */
export function ReportsPage({ scope }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isSuperScope = scope === 'superadmin';
  const paymentTrend = useReportPaymentTrend(12);
  const exchangeTrend = useReportExchangeTrend(12);
  const topSkills = useReportTopSkills(10);
  const uniLeaderboard = useReportUniversityLeaderboard(isSuperScope, 10);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/api/v1/reports');
      setData(res.data ?? null);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Could not load reports'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const title = scope === 'superadmin' ? 'Platform reports' : 'University reports';

  if (loading) {
    return (
      <div>
        <h1>{title}</h1>
        <LoadingState label="Loading report data…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>{title}</h1>
        <ErrorState message={error} onRetry={() => void loadReports()} />
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

  return (
    <div className="reports-page">
      <h1>{title}</h1>

      <div className="report-cards">
        {isSuper ? (
          <>
            <div className="report-stat-card">
              <span className="report-stat-label">Universities on platform</span>
              <span className="report-stat-num">{data.totalUniversities ?? '—'}</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-label">Students (all universities)</span>
              <span className="report-stat-num">{data.totalStudents ?? '—'}</span>
            </div>
          </>
        ) : (
          <div className="report-stat-card">
            <span className="report-stat-label">Students at your university</span>
            <span className="report-stat-num">{data.totalStudents ?? '—'}</span>
          </div>
        )}
      </div>

      {isSuper && Array.isArray(data.universitiesStudentCounts) ? (
        <section className="report-uni-table-section" aria-labelledby="report-uni-students-heading">
          <h2 id="report-uni-students-heading" className="report-section-title">
            Students per university
          </h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">University</th>
                  <th scope="col">Students</th>
                </tr>
              </thead>
              <tbody>
                {data.universitiesStudentCounts.map((u) => (
                  <tr key={u.universityId}>
                    <td>{u.universityName}</td>
                    <td>{u.studentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="report-charts">
        <PaymentTrendChart
          title="Payment volume by month (PKR)"
          series={paymentTrend.series}
          loading={paymentTrend.loading}
          error={paymentTrend.error}
        />
        <ExchangeTrendChart
          title="New exchanges by month"
          series={exchangeTrend.series}
          loading={exchangeTrend.loading}
          error={exchangeTrend.error}
        />
        <TopSkillsChart
          skills={topSkills.skills}
          loading={topSkills.loading}
          error={topSkills.error}
        />
        {isSuper ? (
          <UniversityLeaderboardChart
            universities={uniLeaderboard.universities}
            loading={uniLeaderboard.loading}
            error={uniLeaderboard.error}
          />
        ) : null}
      </div>
    </div>
  );
}
