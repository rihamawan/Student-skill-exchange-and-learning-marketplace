function formatMoney(n) {
  if (n == null || n === '') return '—';
  const x = Number(n);
  return Number.isFinite(x) ? `${x} PKR/hr` : '—';
}

export function OfferedSkillsTable({ items, onEdit, onDelete }) {
  if (!items.length) {
    return <p className="muted">No offers yet. Add one above.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Category</th>
            <th>Mode</th>
            <th>Price</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>{row.skillName}</td>
              <td>{row.categoryName ?? '—'}</td>
              <td>{row.isPaid ? 'Paid' : 'Free exchange'}</td>
              <td>{row.isPaid ? formatMoney(row.pricePerHour) : '—'}</td>
              <td className="crud-actions">
                <button type="button" className="link-button" onClick={() => onEdit(row)}>
                  Edit
                </button>
                <button type="button" className="link-button danger" onClick={() => onDelete(row)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
