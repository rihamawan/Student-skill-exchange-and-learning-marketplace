import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export function RegisterPage() {
  const { register, user, ready, dashboardPathForRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [universities, setUniversities] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingUni, setLoadingUni] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/v1/universities', { method: 'GET', skipAuthRedirect: true });
        const list = Array.isArray(res.data) ? res.data : [];
        setUniversities(list);
      } catch {
        setUniversities([]);
      } finally {
        setLoadingUni(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    navigate(dashboardPathForRole(user.role), { replace: true });
  }, [ready, user, navigate, dashboardPathForRole]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({
        email,
        password,
        fullName,
        phoneNumber: phoneNumber || undefined,
        universityId: universityId || undefined,
      });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (ready && user) {
    return (
      <div className="page-loading">
        <p>Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <h1>Create account</h1>
        <p className="muted">Select a university to register as a student (recommended).</p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            <span>Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Password (min 6 characters)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label className="field">
            <span>Phone (optional)</span>
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </label>
          <label className="field">
            <span>University (optional — required for student role)</span>
            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              disabled={loadingUni}
            >
              <option value="">— None —</option>
              {universities.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
