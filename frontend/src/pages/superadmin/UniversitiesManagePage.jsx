import { useState } from 'react';
import { useUniversitiesCrud } from '../../hooks/useUniversitiesCrud';

export function UniversitiesManagePage() {
  const { items, loading, error, reload, create, update, remove, busy } = useUniversitiesCrud();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formErr, setFormErr] = useState('');

  function startEdit(row) {
    setEditingId(row.id);
    setName(row.name ?? '');
    setAddress(row.address ?? '');
    setContactEmail(row.contactEmail ?? '');
    setFormErr('');
  }

  function clearForm() {
    setEditingId(null);
    setName('');
    setAddress('');
    setContactEmail('');
    setFormErr('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErr('');
    if (!name.trim() || !address.trim() || !contactEmail.trim()) {
      setFormErr('Name, address, and contact email are required.');
      return;
    }
    const payload = {
      universityName: name.trim(),
      address: address.trim(),
      contactEmail: contactEmail.trim(),
    };
    try {
      if (editingId != null) {
        await update(editingId, payload);
      } else {
        await create(payload);
      }
      clearForm();
    } catch {
      /* error set in hook */
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this university? Fails if students or admins reference it.')) return;
    try {
      await remove(id);
    } catch {
      /* hook sets error */
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Universities</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <h1>Universities</h1>
      <p className="muted">Create and maintain universities (registration and admin scope).</p>
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

      <section className="crud-form-card">
        <h2>{editingId != null ? `Edit university #${editingId}` : 'Add university'}</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="uni-name">Name</label>
            <input id="uni-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="uni-addr">Address</label>
            <input id="uni-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="uni-email">Contact email</label>
            <input id="uni-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          {formErr ? (
            <p className="form-error" role="alert">
              {formErr}
            </p>
          ) : null}
          <p>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : editingId != null ? 'Save changes' : 'Create'}
            </button>{' '}
            {editingId != null ? (
              <button type="button" className="btn-secondary" onClick={clearForm}>
                Cancel edit
              </button>
            ) : null}
          </p>
        </form>
      </section>

      {!items.length ? (
        <p className="muted">No universities.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.contactEmail}</td>
                <td>
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => startEdit(u)}>
                    Edit
                  </button>{' '}
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => handleDelete(u.id)}>
                    Delete
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
