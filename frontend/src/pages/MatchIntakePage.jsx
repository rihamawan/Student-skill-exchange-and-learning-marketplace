import { useAuth } from '../context/AuthContext';
import { useMatchIntakeForm } from '../hooks/useMatchIntakeForm';

export function MatchIntakePage() {
  const { user } = useAuth();
  const initialName = user?.name ?? user?.fullName ?? '';
  const f = useMatchIntakeForm({ initialFullName: initialName });

  if (f.loadingRefs) {
    return (
      <div>
        <h1>Match profile (Form 1)</h1>
        <p className="muted">Loading universities and skills…</p>
      </div>
    );
  }

  if (f.loadError) {
    return (
      <div>
        <h1>Match profile (Form 1)</h1>
        <p className="form-error" role="alert">
          {f.loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="match-intake-page">
      <h1>Match profile (Form 1)</h1>
      <p className="muted">
        Save what you offer and what you want. New chats are only created when you and the other student mutually
        match skills and mode (free exchange or paid).
      </p>

      <section className="stack">
        <div className="field">
          <label htmlFor="mi-fullname">Full name</label>
          <input
            id="mi-fullname"
            value={f.fullName}
            onChange={(e) => f.setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="field">
          <label htmlFor="mi-uni">University</label>
          <select
            id="mi-uni"
            value={f.universityId}
            onChange={(e) => f.setUniversityId(e.target.value)}
          >
            <option value="">Select…</option>
            {f.universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <h2>Skills I am offering</h2>
      <p className="muted">Per skill: free exchange or paid, and hourly rate if paid.</p>
      <ul className="match-rows">
        {f.offered.map((row, i) => (
          <li key={`o-${i}`} className="match-row card-like">
            <div className="field">
              <label>Skill</label>
              <select value={row.skillId} onChange={(e) => f.updateOffered(i, { skillId: e.target.value })}>
                <option value="">Select…</option>
                {f.skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>Offer as</span>
              <label className="inline">
                <input
                  type="radio"
                  checked={!row.isPaid}
                  onChange={() => f.updateOffered(i, { isPaid: false, pricePerHour: '' })}
                />
                Free exchange
              </label>
              <label className="inline">
                <input
                  type="radio"
                  checked={row.isPaid}
                  onChange={() => f.updateOffered(i, { isPaid: true })}
                />
                Paid
              </label>
            </div>
            {row.isPaid ? (
              <div className="field">
                <label>Price per hour (PKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.pricePerHour}
                  onChange={(e) => f.updateOffered(i, { pricePerHour: e.target.value })}
                />
              </div>
            ) : null}
            <button type="button" className="btn-secondary" onClick={() => f.removeOffered(i)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-secondary" onClick={f.addOffered}>
        Add offered skill
      </button>

      <h2>Skills I want</h2>
      <ul className="match-rows">
        {f.requested.map((row, i) => (
          <li key={`r-${i}`} className="match-row card-like">
            <div className="field">
              <label>Skill</label>
              <select value={row.skillId} onChange={(e) => f.updateRequested(i, { skillId: e.target.value })}>
                <option value="">Select…</option>
                {f.skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Preferred time</label>
              <select
                value={row.preferredTime}
                onChange={(e) => f.updateRequested(i, { preferredTime: e.target.value })}
              >
                {f.preferredTimes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>I prefer</span>
              <label className="inline">
                <input
                  type="radio"
                  checked={row.preferredMode === 'Exchange'}
                  onChange={() => f.updateRequested(i, { preferredMode: 'Exchange' })}
                />
                Free exchange
              </label>
              <label className="inline">
                <input
                  type="radio"
                  checked={row.preferredMode === 'Paid'}
                  onChange={() => f.updateRequested(i, { preferredMode: 'Paid' })}
                />
                Paid
              </label>
            </div>
            <button type="button" className="btn-secondary" onClick={() => f.removeRequested(i)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-secondary" onClick={f.addRequested}>
        Add wanted skill
      </button>

      {f.saveError ? (
        <p className="form-error" role="alert">
          {f.saveError}
        </p>
      ) : null}
      <p>
        <button type="button" className="btn-primary" disabled={f.saving} onClick={f.submitForm1}>
          {f.saving ? 'Saving…' : 'Save match profile'}
        </button>
      </p>

      <hr />

      <h2>Students you can pair with</h2>
      <p className="muted">
        We look at everyone at <strong>your university</strong> and list people where <strong>both</strong> sides have a
        valid swap: you teach something they asked for (same free/paid mode), and they teach something you asked for.
        Refresh after you save, or after others update their profiles.
      </p>
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
        <p className="muted">No mutual matches yet — save your profile above, and make sure another student has complementary offers/requests.</p>
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

      <h2>Check match by ID (optional)</h2>
      <p className="muted">
        If you already know someone’s user ID, you can verify a pair with them without using the list above.
      </p>
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
