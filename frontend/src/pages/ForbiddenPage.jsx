import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ForbiddenPage() {
  const { user, dashboardPathForRole } = useAuth();
  const home = user ? dashboardPathForRole(user.role) : '/login';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Access denied</h1>
        <p className="muted">You do not have permission to view this page.</p>
        <Link className="btn-primary link-button" to={home}>
          Go back
        </Link>
      </div>
    </div>
  );
}
