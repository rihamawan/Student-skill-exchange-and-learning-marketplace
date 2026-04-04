import { Fragment } from 'react';
import { RequestPeersForRow } from './RequestPeersForRow';

export function RequestedSkillsTable({ items, onEdit, onDelete }) {
  if (!items.length) {
    return <p className="muted">No requests yet. Add one above.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Category</th>
            <th>Preferred time</th>
            <th>Mode</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <Fragment key={row.id}>
              <tr>
                <td>{row.skillName}</td>
                <td>{row.categoryName ?? '—'}</td>
                <td>{row.preferredTime ?? '—'}</td>
                <td>{row.preferredMode === 'Paid' ? 'Paid' : 'Free exchange'}</td>
                <td>
                  <span className={`status-pill status-${row.status}`}>{row.status}</span>
                </td>
                <td className="crud-actions">
                  <button type="button" className="link-button" onClick={() => onEdit(row)}>
                    Edit status
                  </button>
                  <button type="button" className="link-button danger" onClick={() => onDelete(row)}>
                    Delete
                  </button>
                </td>
              </tr>
              {row.status === 'open' ? (
                <tr className="request-peers-subrow">
                  <td colSpan={6}>
                    <RequestPeersForRow
                      requestId={row.id}
                      skillName={row.skillName ?? 'this skill'}
                      preferredMode={row.preferredMode}
                    />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
