import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function HomeRedirect() {
  const { user, ready, dashboardPathForRole } = useAuth();
  if (!ready) {
    return (
      <div className="page-loading">
        <p>Loading…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={dashboardPathForRole(user.role)} replace />;
}
