import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudentExchanges } from '../hooks/useStudentExchanges';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export function ExchangesPage() {
  const { items, loading, error, savingId, reload, updateStatus, statusOptions } = useStudentExchanges();
  const [rowStatus, setRowStatus] = useState({});
  const [actionError, setActionError] = useState('');

  function setStatusForRow(id, value) {
    setRowStatus((prev) => ({ ...prev, [id]: value }));
  }

  useEffect(() => {
    const next = {};
    items.forEach((row) => {
      next[row.id] = row.status ?? 'pending';
    });
    setRowStatus(next);
  }, [items]);

  async function handleSaveStatus(row) {
    setActionError('');
    const next = rowStatus[row.id] ?? row.status;
    if (!next || next === row.status) return;
    try {
      await updateStatus(row.id, next);
    } catch (e) {
      setActionError(e.message || 'Could not update status');
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Exchanges</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crud-page">
        <h1>Exchanges</h1>
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
      <h1>Exchanges</h1>
      <p className="muted">
        Learning exchanges you are part of (as offerer or requester). Update status as your sessions progress.
      </p>

      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {!items.length ? (
        <p className="muted">No exchanges yet. Complete match profile, chat, and confirm an exchange when ready.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table exchanges-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Type</th>
                <th>Offerer</th>
                <th>Requester</th>
                <th>Status</th>
                <th>Created</th>
                <th>Chat</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.skillName ?? '—'}</td>
                  <td className="nowrap">{row.exchangeType === 'paid' ? 'Paid' : 'Exchange'}</td>
                  <td>{row.offererName ?? '—'}</td>
                  <td>{row.requesterName ?? '—'}</td>
                  <td>
                    <select
                      className="table-select"
                      value={rowStatus[row.id] ?? row.status ?? 'pending'}
                      onChange={(e) => setStatusForRow(row.id, e.target.value)}
                      disabled={savingId === row.id}
                      aria-label={`Status for exchange ${row.id}`}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="muted small-cell">{formatDate(row.createdAt)}</td>
                  <td>
                    {row.conversationId ? (
                      <Link to="/student/conversations">Open chats</Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary btn-compact"
                      disabled={
                        savingId === row.id || (rowStatus[row.id] ?? row.status) === row.status
                      }
                      onClick={() => handleSaveStatus(row)}
                    >
                      {savingId === row.id ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
