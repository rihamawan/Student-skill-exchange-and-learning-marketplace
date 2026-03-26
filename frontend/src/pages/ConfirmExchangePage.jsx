import { Link, useParams } from 'react-router-dom';
import { useConfirmExchangeForm } from '../hooks/useConfirmExchangeForm';

const PLATFORMS = ['Zoom', 'Google Meet', 'Teams', 'Other'];

export function ConfirmExchangePage() {
  const { conversationId } = useParams();
  const f = useConfirmExchangeForm(conversationId);

  if (f.loading) {
    return (
      <div>
        <h1>Confirm exchange (Form 2)</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (f.loadError) {
    return (
      <div>
        <h1>Confirm exchange (Form 2)</h1>
        <p className="form-error" role="alert">
          {f.loadError}
        </p>
        <p>
          <Link to="/student/conversations">Back to conversations</Link>
        </p>
      </div>
    );
  }

  const teach = f.eligibility?.iTeachPeer;
  const learn = f.eligibility?.peerTeachesMe;
  const dual = Boolean(f.eligibility?.mutualSwapReady && teach && learn);
  const er = f.eligibility?.exchangeReadiness;

  return (
    <div className="confirm-exchange-page">
      <h1>Confirm exchange (Form 2)</h1>
      <p className="muted">
        Turn on readiness when you agree in chat. When both are on, you can submit. A full swap creates two exchanges.
      </p>

      <section className="exchange-readiness-panel card-like">
        <h2 className="readiness-heading">Ready to confirm (both required)</h2>
        <p className="muted">
          You: {er?.iAmReady ? 'On' : 'Off'} · Peer: {er?.peerReady ? 'On' : 'Off'}
          {er?.bothReady ? ' — both ready.' : ''}
        </p>
        <button
          type="button"
          className="btn-secondary"
          disabled={f.readinessSaving}
          onClick={() => f.patchMyReadiness(!er?.iAmReady)}
        >
          {f.readinessSaving ? 'Saving…' : er?.iAmReady ? 'Turn my readiness off' : 'I am ready to confirm'}
        </button>
        {f.readinessError ? (
          <p className="form-error" role="alert">
            {f.readinessError}
          </p>
        ) : null}
      </section>

      {!teach && !learn ? (
        <p className="form-error">No open matching pair for this conversation. Check match profile and requests.</p>
      ) : (
        <ul className="muted">
          {teach ? (
            <li>
              You teach (offer #{teach.offerId} → their request #{teach.requestId})
              {teach.isPaid ? ' — paid' : ' — free exchange'}
            </li>
          ) : null}
          {learn ? (
            <li>
              You learn (their offer #{learn.offerId} → your request #{learn.requestId})
              {learn.isPaid ? ' — paid' : ' — free exchange'}
            </li>
          ) : null}
        </ul>
      )}

      <section className="stack">
        <div className="field">
          <span>Meeting type</span>
          <label className="inline">
            <input
              type="radio"
              checked={f.meetingType === 'physical'}
              onChange={() => f.setMeetingType('physical')}
            />
            Physical
          </label>
          <label className="inline">
            <input
              type="radio"
              checked={f.meetingType === 'online'}
              onChange={() => f.setMeetingType('online')}
            />
            Online
          </label>
        </div>

        <div className="field">
          <label htmlFor="cf-venue">Venue</label>
          <input
            id="cf-venue"
            value={f.venue}
            onChange={(e) => f.setVenue(e.target.value)}
            placeholder="Address or Online"
          />
        </div>

        <div className="field">
          <label htmlFor="cf-date">Date</label>
          <input
            id="cf-date"
            type="date"
            value={f.dateStr}
            onChange={(e) => f.setDateStr(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cf-start">Start time</label>
          <input
            id="cf-start"
            type="time"
            value={f.startTime}
            onChange={(e) => f.setStartTime(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cf-end">End time</label>
          <input
            id="cf-end"
            type="time"
            value={f.endTime}
            onChange={(e) => f.setEndTime(e.target.value)}
          />
        </div>

        {f.meetingType === 'online' ? (
          <>
            <div className="field">
              <label htmlFor="cf-platform">Platform</label>
              <select id="cf-platform" value={f.platform} onChange={(e) => f.setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cf-link">Meeting link (optional)</label>
              <input
                id="cf-link"
                type="url"
                value={f.meetingLink}
                onChange={(e) => f.setMeetingLink(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="cf-pass">Meeting password (optional)</label>
              <input
                id="cf-pass"
                value={f.meetingPassword}
                onChange={(e) => f.setMeetingPassword(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {dual && teach?.isPaid ? (
          <div className="field">
            <label htmlFor="cf-price-teach">Agreed price when you teach (PKR)</label>
            <input
              id="cf-price-teach"
              type="number"
              min="0.01"
              step="0.01"
              value={f.priceTeach}
              onChange={(e) => f.setPriceTeach(e.target.value)}
            />
          </div>
        ) : null}
        {!dual && teach?.isPaid ? (
          <div className="field">
            <label htmlFor="cf-price-single">Agreed price (PKR)</label>
            <input
              id="cf-price-single"
              type="number"
              min="0.01"
              step="0.01"
              value={f.priceTeach}
              onChange={(e) => f.setPriceTeach(e.target.value)}
            />
          </div>
        ) : null}

        {dual && learn?.isPaid ? (
          <div className="field">
            <label htmlFor="cf-price-learn">Agreed price when they teach you (PKR)</label>
            <input
              id="cf-price-learn"
              type="number"
              min="0.01"
              step="0.01"
              value={f.priceLearn}
              onChange={(e) => f.setPriceLearn(e.target.value)}
            />
          </div>
        ) : null}
        {!dual && learn?.isPaid ? (
          <div className="field">
            <label htmlFor="cf-price-learn-only">Agreed price (PKR)</label>
            <input
              id="cf-price-learn-only"
              type="number"
              min="0.01"
              step="0.01"
              value={f.priceLearn}
              onChange={(e) => f.setPriceLearn(e.target.value)}
            />
          </div>
        ) : null}

      </section>

      {f.submitError ? (
        <p className="form-error" role="alert">
          {f.submitError}
        </p>
      ) : null}

      <p>
        <button
          type="button"
          className="btn-primary"
          disabled={f.submitting || (!teach && !learn) || !er?.bothReady}
          onClick={f.submit}
        >
          {f.submitting ? 'Submitting…' : dual ? 'Create two exchanges & sessions' : 'Create exchange & session'}
        </button>
      </p>
      <p className="muted">
        <Link to="/student/conversations">Back to conversations</Link>
      </p>
    </div>
  );
}
