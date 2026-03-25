import { Link } from 'react-router-dom';

export function AdminDashboard() {
  return (
    <div>
      <h1>University admin</h1>
      <p className="muted">Manage students and data for your university.</p>
      <div className="dashboard-grid">
        <Link className="dash-card" to="/admin/students">
          <h2>Students</h2>
          <p>View and verify students</p>
        </Link>
        <Link className="dash-card" to="/admin/reports">
          <h2>Reports</h2>
          <p>University dashboard stats</p>
        </Link>
        <Link className="dash-card" to="/admin/evaluations">
          <h2>Skill evaluations</h2>
          <p>Assessments and grading</p>
        </Link>
      </div>
    </div>
  );
}
