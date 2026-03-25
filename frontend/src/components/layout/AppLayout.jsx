import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

export function AppLayout({ navItems }) {
  const { user, logout } = useAuth();
  const role = String(user?.role ?? '');
  const dashboardRoots = ['/student', '/admin', '/superadmin'];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">Skill Exchange</div>
        <nav className="side-nav">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={linkClass}
              end={dashboardRoots.includes(to)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-meta">
            <span className="user-name">{user?.fullName || user?.name || 'User'}</span>
            <span className="user-role">{role || '—'}</span>
          </div>
          <button type="button" className="btn-secondary" onClick={logout}>
            Log out
          </button>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
