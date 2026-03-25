import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function RequireRole({ roles, children }) {
  const { user, dashboardPathForRole } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();
  const allowed = roles.map((r) => String(r).toLowerCase());

  if (!allowed.includes(role)) {
    const fallback = dashboardPathForRole(user?.role);
    if (fallback && fallback !== '/login') {
      return <Navigate to={fallback} replace />;
    }
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
