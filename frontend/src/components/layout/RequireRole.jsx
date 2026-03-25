import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function RequireRole({ roles, children }) {
  const { user, dashboardPathForRole } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();
  const allowed = roles.map((r) => String(r).toLowerCase());

  if (!allowed.includes(role)) {
    const fallback = dashboardPathForRole(user?.role);
    if (fallback) {
      // If we know the role, redirect to the correct dashboard.
      // If role is missing/unknown, go to login.
      return <Navigate to={fallback} replace={false} />;
    }
    return <Navigate to="/forbidden" replace={false} />;
  }

  return children;
}
