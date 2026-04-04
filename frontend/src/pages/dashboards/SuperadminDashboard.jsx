import { Link } from 'react-router-dom';

export function SuperadminDashboard() {
  return (
    <div>
      <h1>Platform superadmin</h1>
      <div className="dashboard-grid">
        <Link className="dash-card" to="/superadmin/universities">
          <h2>Universities</h2>
          <p>Institutions on the platform</p>
        </Link>
        <Link className="dash-card" to="/superadmin/skills">
          <h2>Skills catalog</h2>
          <p>Manage skill taxonomy</p>
        </Link>
        <Link className="dash-card" to="/superadmin/admins">
          <h2>Admins</h2>
          <p>Admin accounts</p>
        </Link>
        <Link className="dash-card" to="/superadmin/reports">
          <h2>Reports</h2>
          <p>Platform-wide analytics</p>
        </Link>
      </div>
    </div>
  );
}
