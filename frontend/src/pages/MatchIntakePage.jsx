import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMatchIntakeForm } from '../hooks/useMatchIntakeForm';

export function MatchIntakePage() {
  const { user } = useAuth();
  const f = useMatchIntakeForm();

  const displayName = user?.fullName || user?.name || user?.email || '—';

  return (
    <div className="match-intake-page">
      <h1>Profile &amp; matching</h1>
      <p className="muted">
        Signed in as <strong>{displayName}</strong>. ·{' '}
        <Link to="/student/offered-skills">Offered skills</Link> ·{' '}
        <Link to="/student/requested-skills">Requested skills</Link>
      </p>

      <h2>Students you can pair with</h2>
      <p className="muted">Same university.</p>
      <p>
        <button type="button" className="btn-secondary" disabled={f.loadingMatches} onClick={() => f.loadMutualMatches()}>
          {f.loadingMatches ? 'Loading…' : 'Refresh match list'}
        </button>
      </p>
      {f.matchesError ? (
        <p className="form-error" role="alert">
          {f.matchesError}
        </p>
      ) : null}
      {!f.loadingMatches && f.mutualMatches.length === 0 ? (
        <p className="muted">No matches yet.</p>
      ) : null}
      {f.mutualMatches.length > 0 ? (
        <ul className="match-suggestions">
          {f.mutualMatches.map((m) => (
            <li key={m.studentId} className="match-suggestion card-like">
              <span>
                <strong>{m.fullName}</strong>
                <span className="muted"> — ID {m.studentId}</span>
              </span>
              <button
                type="button"
                className="btn-primary"
                disabled={f.opening}
                onClick={() => f.openConversationWithPeer(m.studentId)}
              >
                Open chat
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <h2>Check by student ID</h2>
      <p className="muted">Optional — if you already know their ID.</p>
      <div className="field">
        <label htmlFor="mi-other">Other student ID</label>
        <input
          id="mi-other"
          type="number"
          min="1"
          value={f.otherStudentId}
          onChange={(e) => f.setOtherStudentId(e.target.value)}
        />
      </div>
      <p>
        <button type="button" className="btn-secondary" disabled={f.checking} onClick={f.checkMatch}>
          {f.checking ? 'Checking…' : 'Check mutual match'}
        </button>
      </p>
      {f.checkError ? (
        <p className="form-error" role="alert">
          {f.checkError}
        </p>
      ) : null}
      {f.checkResult ? (
        <p className={f.checkResult.matched ? 'match-ok' : 'form-error'}>
          {f.checkResult.matched
            ? 'Mutual match: you can open a conversation.'
            : 'No mutual match yet — adjust offers/requests or ask the other student to update theirs.'}
        </p>
      ) : null}
      {f.openError ? (
        <p className="form-error" role="alert">
          {f.openError}
        </p>
      ) : null}
      <p>
        <button
          type="button"
          className="btn-primary"
          disabled={f.opening || !f.checkResult?.matched}
          onClick={f.openConversation}
        >
          {f.opening ? 'Opening…' : 'Open conversation'}
        </button>
      </p>
    </div>
  );
}
