import { Link } from 'react-router-dom';

export function StudentDashboard() {
  return (
    <div>
      <h1>Student dashboard</h1>
      <p className="muted">Overview of your skill exchange activity.</p>
      <div className="dashboard-grid">
        <Link className="dash-card" to="/student/match-profile">
          <h2>Match profile</h2>
          <p>Form 1: what you offer &amp; want, then start a matched chat</p>
        </Link>
        <Link className="dash-card" to="/student/offered-skills">
          <h2>Offered skills</h2>
          <p>Skills you can teach others</p>
        </Link>
        <Link className="dash-card" to="/student/requested-skills">
          <h2>Requested skills</h2>
          <p>Skills you want to learn</p>
        </Link>
        <Link className="dash-card" to="/student/conversations">
          <h2>Conversations</h2>
          <p>Messages with other students</p>
        </Link>
        <Link className="dash-card" to="/student/exchanges">
          <h2>Exchanges</h2>
          <p>Active and past exchanges</p>
        </Link>
      </div>
    </div>
  );
}
