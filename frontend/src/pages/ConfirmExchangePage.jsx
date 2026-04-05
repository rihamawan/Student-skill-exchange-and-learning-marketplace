import { Link, useParams } from 'react-router-dom';
import { useConfirmExchangeForm } from '../hooks/useConfirmExchangeForm';

const PLATFORMS = ['Zoom', 'Google Meet', 'Teams', 'Other'];

function bundleLabel(b) {
  if (b.kind === 'mutual_exchange' && b.legs?.length === 2) {
    const a = b.legs[0].skillName ?? 'Skill A';
    const c = b.legs[1].skillName ?? 'Skill B';
    return `Free swap: ${a} ↔ ${c}`;
  }
  const leg = b.legs?.[0];
  if (!leg) return b.bundleKey;
  return `${leg.isPaid ? 'Paid' : 'Free'}: ${leg.skillName ?? 'Skill'} (${leg.roleLabel ?? 'session'})`;
}

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

  const bundles = f.eligibility?.bundles ?? [];
  const er = f.eligibility?.exchangeReadiness;

  return (
    <div className="confirm-exchange-page">
      <h1>Confirm exchange (Form 2)</h1>
      <p className="muted">
        Choose which skill exchange this confirmation is for. Turn on readiness for <strong>this bundle</strong> when
        you agree in chat. Each learner fills venue and time for <strong>their own</strong> request (two forms for a free
        two-way swap; one form for a single paid or single-direction session).
      </p>

      {bundles.length === 0 ? (
        <p className="form-error">No eligible exchange bundles for this conversation. Check open requests and offers.</p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="bundle-select">Exchange bundle</label>
            <select
              id="bundle-select"
              value={f.selectedBundleKey}
              onChange={(e) => f.setSelectedBundleKey(e.target.value)}
            >
              {bundles.map((b) => (
                <option key={b.bundleKey} value={b.bundleKey}>
                  {bundleLabel(b)}
                </option>
              ))}
            </select>
          </div>

          <section className="exchange-readiness-panel card-like">
            <h2 className="readiness-heading">Ready for this bundle (both required)</h2>
            <p className="muted">
              You: {er?.iAmReady ? 'On' : 'Off'} · Peer: {er?.peerReady ? 'On' : 'Off'}
              {er?.bothReady ? ' — both ready.' : ''}
            </p>
            <button
              type="button"
              className="btn-secondary"
              disabled={f.readinessSaving || !f.selectedBundleKey}
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

          {f.selectedBundle?.legs?.map((leg) => {
            const mine = f.myStudentId != null && Number(leg.learnerStudentId) === Number(f.myStudentId);
            const s = f.legSessions[leg.requestId] ?? {};
            const rid = leg.requestId;
            return (
              <section key={`${leg.offerId}-${rid}`} className="crud-form-card stack" style={{ marginTop: '1rem' }}>
                <h2>
                  {leg.skillName ?? 'Skill'} — {leg.roleLabel}
                  {leg.isPaid ? ' (paid)' : ' (free exchange)'}
                </h2>
                {!mine ? (
                  <p className="muted">
                    The student who requested this skill enters venue and time. They can save a draft; refresh this page
                    after they do so everyone can submit together.
                  </p>
                ) : (
                  <>
                    <div className="field">
                      <span>Meeting type</span>
                      <label className="inline">
                        <input
                          type="radio"
                          checked={(s.meetingType ?? 'physical') === 'physical'}
                          onChange={() => f.updateLegSession(rid, { meetingType: 'physical' })}
                        />
                        Physical
                      </label>
                      <label className="inline">
                        <input
                          type="radio"
                          checked={(s.meetingType ?? 'physical') === 'online'}
                          onChange={() => f.updateLegSession(rid, { meetingType: 'online' })}
                        />
                        Online
                      </label>
                    </div>
                    <div className="field">
                      <label htmlFor={`venue-${rid}`}>Venue</label>
                      <input
                        id={`venue-${rid}`}
                        value={s.venue ?? ''}
                        onChange={(e) => f.updateLegSession(rid, { venue: e.target.value })}
                        placeholder="Address or Online"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`date-${rid}`}>Date</label>
                      <input
                        id={`date-${rid}`}
                        type="date"
                        value={s.dateStr ?? ''}
                        onChange={(e) => f.updateLegSession(rid, { dateStr: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`start-${rid}`}>Start time</label>
                      <input
                        id={`start-${rid}`}
                        type="time"
                        value={s.startTime ?? ''}
                        onChange={(e) => f.updateLegSession(rid, { startTime: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`end-${rid}`}>End time</label>
                      <input
                        id={`end-${rid}`}
                        type="time"
                        value={s.endTime ?? ''}
                        onChange={(e) => f.updateLegSession(rid, { endTime: e.target.value })}
                      />
                    </div>
                    {(s.meetingType ?? 'physical') === 'online' ? (
                      <>
                        <div className="field">
                          <label htmlFor={`plat-${rid}`}>Platform</label>
                          <select
                            id={`plat-${rid}`}
                            value={s.platform ?? 'Zoom'}
                            onChange={(e) => f.updateLegSession(rid, { platform: e.target.value })}
                          >
                            {PLATFORMS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor={`link-${rid}`}>Meeting link (optional)</label>
                          <input
                            id={`link-${rid}`}
                            type="url"
                            value={s.meetingLink ?? ''}
                            onChange={(e) => f.updateLegSession(rid, { meetingLink: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`pass-${rid}`}>Meeting password (optional)</label>
                          <input
                            id={`pass-${rid}`}
                            value={s.meetingPassword ?? ''}
                            onChange={(e) => f.updateLegSession(rid, { meetingPassword: e.target.value })}
                          />
                        </div>
                      </>
                    ) : null}
                    {leg.isPaid ? (
                      <div className="field">
                        <label htmlFor={`price-${rid}`}>Agreed price (PKR)</label>
                        <input
                          id={`price-${rid}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={s.price ?? ''}
                          onChange={(e) => f.updateLegSession(rid, { price: e.target.value })}
                        />
                      </div>
                    ) : null}
                    <p>
                      <button type="button" className="btn-secondary" disabled={f.draftSaving} onClick={() => f.saveDraftForRequest(rid)}>
                        {f.draftSaving ? 'Saving…' : 'Save draft for this session'}
                      </button>
                      {f.draftMessage ? <span className="muted small"> {f.draftMessage}</span> : null}
                    </p>
                  </>
                )}
              </section>
            );
          })}
        </>
      )}

      {f.submitError ? (
        <p className="form-error" role="alert">
          {f.submitError}
        </p>
      ) : null}

      <p style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className="btn-primary"
          disabled={
            f.submitting ||
            bundles.length === 0 ||
            !f.selectedBundleKey ||
            !er?.bothReady ||
            !f.selectedBundle
          }
          onClick={f.submit}
        >
          {f.submitting
            ? 'Submitting…'
            : f.selectedBundle?.kind === 'mutual_exchange'
              ? 'Create two exchanges & sessions'
              : 'Create exchange & session'}
        </button>
      </p>
      <p className="muted">
        <Link to="/student/conversations">Back to conversations</Link>
      </p>
    </div>
  );
}
