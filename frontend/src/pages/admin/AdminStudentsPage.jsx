import { useAdminStudents } from '../../hooks/useAdminStudents';

export function AdminStudentsPage() {
  const { items, loading, error, reload, setVerified, savingId } = useAdminStudents();

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Students</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <div className="crud-page">
        <h1>Students</h1>
        <p className="form-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn-secondary" onClick={() => reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <h1>Students</h1>
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
      {!items.length ? (
        <p className="muted">No students found for your university.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Verified</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.fullName}</td>
                <td>{s.email}</td>
                <td>{s.isAdminVerified ? 'Yes' : 'No'}</td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={savingId === s.id}
                    onClick={() => setVerified(s.id, !s.isAdminVerified)}
                  >
                    {s.isAdminVerified ? 'Unverify' : 'Verify'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
