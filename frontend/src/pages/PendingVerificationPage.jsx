import { useAuth } from '../context/AuthContext';

export function PendingVerificationPage({ message }) {
  const { logout } = useAuth();

  return (
    <div className="crud-page">
      <h1>Pending verification</h1>
      <p className="muted">Your account is pending admin approval — the student portal stays locked until then.</p>

      {message ? (
        <p className="form-error" role="alert">
          {message}
        </p>
      ) : null}

      <p>
        <button type="button" className="btn-secondary" onClick={logout}>
          Log out (switch account)
        </button>
      </p>
    </div>
  );
}

