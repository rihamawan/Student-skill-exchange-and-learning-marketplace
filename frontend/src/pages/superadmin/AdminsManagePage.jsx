import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAdminsCrud } from '../../hooks/useAdminsCrud';

export function AdminsManagePage() {
  const { user } = useAuth();
  const myId = user?.id != null ? Number(user.id) : null;
  const { admins, universities, loading, error, reload, createAdmin, updateAdmin, removeAdmin, busy } =
    useAdminsCrud();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [adminLevel, setAdminLevel] = useState('standard');
  const [formErr, setFormErr] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setFormErr('');
    const uid = Number(universityId);
    if (!email.trim() || password.length < 6 || !fullName.trim() || !Number.isFinite(uid) || uid < 1) {
      setFormErr('Email, password (6+ chars), full name, and university are required.');
      return;
    }
    try {
      await createAdmin({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        universityId: uid,
        adminLevel,
      });
      setEmail('');
      setPassword('');
      setFullName('');
      setUniversityId('');
      setAdminLevel('standard');
    } catch {
      /* hook */
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Admins</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <h1>Admins</h1>
      <p className="muted">Create university admins. Use sparingly for new superadmin accounts.</p>
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
        <h2>Add admin</h2>
        <form className="stack" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="ad-email">Email</label>
            <input id="ad-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="ad-pw">Password</label>
            <input
              id="ad-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label htmlFor="ad-name">Full name</label>
            <input id="ad-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ad-uni">University</label>
            <select id="ad-uni" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
              <option value="">Select…</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ad-lvl">Admin level</label>
            <select id="ad-lvl" value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)}>
              <option value="standard">standard</option>
              <option value="superadmin">superadmin</option>
            </select>
          </div>
          {formErr ? (
            <p className="form-error" role="alert">
              {formErr}
            </p>
          ) : null}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create admin'}
          </button>
        </form>
      </section>

      {!admins.length ? (
        <p className="muted">No admins.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>University</th>
              <th>Level</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <AdminRow
                key={a.id}
                admin={a}
                universities={universities}
                busy={busy}
                myId={myId}
                onUpdate={(body) => updateAdmin(a.id, body)}
                onRemove={() => removeAdmin(a.id)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AdminRow({ admin, universities, busy, myId, onUpdate, onRemove }) {
  const [universityId, setUniversityId] = useState(String(admin.universityId ?? ''));
  const [adminLevel, setAdminLevel] = useState(admin.adminLevel ?? 'standard');
  const isSelf = myId != null && Number(admin.id) === myId;

  return (
    <tr>
      <td>{admin.id}</td>
      <td>{admin.fullName}</td>
      <td>{admin.email}</td>
      <td>
        <select value={universityId} onChange={(e) => setUniversityId(e.target.value)} aria-label="University">
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)}>
          <option value="standard">standard</option>
          <option value="superadmin">superadmin</option>
        </select>
      </td>
      <td>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => {
            void onUpdate({
              universityId: Number(universityId),
              adminLevel,
            });
          }}
        >
          Save
        </button>{' '}
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || isSelf}
          title={isSelf ? 'Cannot remove your own admin row while logged in' : 'Remove admin role'}
          onClick={() => {
            if (window.confirm('Remove this admin role?')) void onRemove();
          }}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
