import { useAdminEvaluations } from '../../hooks/useAdminEvaluations';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export function AdminEvaluationsPage() {
  const { evaluations, loading, error, reload } = useAdminEvaluations();

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Skill evaluations</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <h1>Skill evaluations</h1>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <p>
        <button type="button" className="btn-secondary" onClick={() => reload()}>
          Refresh
        </button>
      </p>

      {!evaluations.length ? (
        <p className="muted">No evaluations yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Skill</th>
              <th>Status</th>
              <th>Score</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.id}</td>
                <td>{ev.studentName ?? ev.studentId}</td>
                <td>{ev.skillName ?? ev.skillId}</td>
                <td>{ev.status ?? '—'}</td>
                <td>
                  {ev.score != null && ev.totalPossible != null
                    ? `${ev.score} / ${ev.totalPossible}`
                    : ev.score != null
                      ? String(ev.score)
                      : '—'}
                </td>
                <td>{formatWhen(ev.submittedAt ?? ev.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
