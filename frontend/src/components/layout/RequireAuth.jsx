import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="page-loading">
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    // Do not replace so the browser Back key can return to the previous page.
    return <Navigate to="/login" state={{ from: location }} replace={false} />;
  }

  return children;
}
