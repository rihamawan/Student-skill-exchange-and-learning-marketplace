import { Link } from 'react-router-dom';

export function StudentDashboard() {
  return (
    <div>
      <h1>Student dashboard</h1>
      <div className="dashboard-grid">
        <Link className="dash-card" to="/student/match-profile">
          <h2>Profile &amp; matching</h2>
          <p>Set your match preferences and discover students you can swap skills with.</p>
        </Link>
        <Link className="dash-card" to="/student/offered-skills">
          <h2>Offered skills</h2>
          <p>List what you can teach and optional PKR/hour pricing.</p>
        </Link>
        <Link className="dash-card" to="/student/requested-skills">
          <h2>Requested skills</h2>
          <p>Record what you want to learn and explore compatible peers.</p>
        </Link>
        <Link className="dash-card" to="/student/conversations">
          <h2>Conversations</h2>
          <p>Chat with peers while you arrange a skill exchange.</p>
        </Link>
        <Link className="dash-card" to="/student/exchanges">
          <h2>Exchanges</h2>
          <p>Track confirmed swaps and session status in one place.</p>
        </Link>
      </div>
    </div>
  );
}
