import { useMemo, useState } from 'react';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { getTokenUserId } from '../lib/jwtPayload';
import { getUserFacingMessage } from '../lib/apiErrors';
import { peerFromConversation, useTransactionDemo } from '../hooks/useTransactionDemo';

function combineDateTime(date, time) {
  if (!date || !time) return '';
  return `${date} ${time}:00`;
}

function rollbackHint(status) {
  if (status === 500) {
    return ' The database transaction was rolled back; nothing was saved.';
  }
  return '';
}

export function TransactionDemoPage() {
  const {
    conversations,
    myOffers,
    allOffers,
    myRequests,
    openRequests,
    exchanges,
    loading,
    error,
    reload,
    runMatchRequest,
    runPaidExchange,
  } = useTransactionDemo();

  const myId = getTokenUserId();

  const [direction, setDirection] = useState('teach');
  const [conversationId, setConversationId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('Online');

  const [paidExchangeId, setPaidExchangeId] = useState('');
  const [paidPrice, setPaidPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [matchBusy, setMatchBusy] = useState(false);
  const [paidBusy, setPaidBusy] = useState(false);
  const [matchMsg, setMatchMsg] = useState('');
  const [matchErr, setMatchErr] = useState('');
  const [paidMsg, setPaidMsg] = useState('');
  const [paidErr, setPaidErr] = useState('');

  const selectedConv = useMemo(() => {
    const id = Number(conversationId);
    return conversations.find((c) => Number(c.id) === id) ?? null;
  }, [conversations, conversationId]);

  const peerId = selectedConv && myId != null ? peerFromConversation(selectedConv, myId) : null;

  const myOpenRequests = useMemo(
    () => myRequests.filter((r) => String(r.status).toLowerCase() === 'open'),
    [myRequests]
  );

  const peerRequestsForTeach = useMemo(() => {
    if (direction !== 'teach' || peerId == null || !offerId) return [];
    const o = myOffers.find((x) => Number(x.id) === Number(offerId));
    if (!o) return [];
    return openRequests.filter(
      (r) =>
        Number(r.studentId) === Number(peerId) &&
        Number(r.skillId) === Number(o.skillId) &&
        String(r.status).toLowerCase() === 'open'
    );
  }, [direction, peerId, offerId, myOffers, openRequests]);

  const peerOffersForLearn = useMemo(() => {
    if (direction !== 'learn' || peerId == null || !requestId) return [];
    const rq = myOpenRequests.find((x) => Number(x.id) === Number(requestId));
    if (!rq) return [];
    return allOffers.filter(
      (o) =>
        Number(o.studentId) === Number(peerId) &&
        Number(o.skillId) === Number(rq.skillId)
    );
  }, [direction, peerId, requestId, myOpenRequests, allOffers]);

  const selectedOfferSkillName = useMemo(() => {
    if (!offerId) return '';
    const o = myOffers.find((x) => Number(x.id) === Number(offerId));
    return o?.skillName != null ? String(o.skillName) : '';
  }, [offerId, myOffers]);

  const selectedMyRequestSkillName = useMemo(() => {
    if (!requestId || direction !== 'learn') return '';
    const r = myOpenRequests.find((x) => Number(x.id) === Number(requestId));
    return r?.skillName != null ? String(r.skillName) : '';
  }, [requestId, direction, myOpenRequests]);

  const matchRequestReady = useMemo(() => {
    const cid = Number(conversationId);
    const oid = Number(offerId);
    const rid = Number(requestId);
    if (!Number.isFinite(cid) || cid < 1) return false;
    if (!Number.isFinite(oid) || oid < 1) return false;
    if (!Number.isFinite(rid) || rid < 1) return false;
    if (!dateStr?.trim() || !startTime || !endTime) return false;
    if (direction === 'teach' && offerId && peerRequestsForTeach.length === 0) return false;
    if (direction === 'learn' && requestId && peerOffersForLearn.length === 0) return false;
    return true;
  }, [
    conversationId,
    offerId,
    requestId,
    dateStr,
    startTime,
    endTime,
    direction,
    peerRequestsForTeach.length,
    peerOffersForLearn.length,
  ]);

  async function handleMatchSubmit(e) {
    e.preventDefault();
    setMatchErr('');
    setMatchMsg('');
    const cid = Number(conversationId);
    const oid = Number(offerId);
    const rid = Number(requestId);
    if (!Number.isFinite(cid) || !Number.isFinite(oid) || !Number.isFinite(rid)) {
      setMatchErr('Choose a conversation, and both offer and request IDs.');
      return;
    }
    const scheduledStart = combineDateTime(dateStr, startTime);
    const scheduledEnd = combineDateTime(dateStr, endTime);
    if (!scheduledStart || !scheduledEnd) {
      setMatchErr('Date and start/end times are required.');
      return;
    }
    setMatchBusy(true);
    try {
      const res = await runMatchRequest({
        conversationId: cid,
        offerId: oid,
        requestId: rid,
        scheduledStart,
        scheduledEnd,
        venue: venue.trim() || 'Online',
      });
      const d = res.data;
      setMatchMsg(
        `Match created. Exchange #${d?.exchangeId ?? '?'}, session #${d?.sessionId ?? '?'}.`
      );
    } catch (err) {
      setMatchErr(getUserFacingMessage(err, 'Match request failed') + rollbackHint(err.status));
    } finally {
      setMatchBusy(false);
    }
  }

  async function handlePaidSubmit(e) {
    e.preventDefault();
    setPaidErr('');
    setPaidMsg('');
    const eid = Number(paidExchangeId);
    const price = Number(paidPrice);
    if (!Number.isFinite(eid) || eid < 1) {
      setPaidErr('Select an exchange.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setPaidErr('Enter a valid price (PKR).');
      return;
    }
    setPaidBusy(true);
    try {
      await runPaidExchange({
        exchangeId: eid,
        price,
        currency: 'PKR',
        paymentMethod: paymentMethod.trim() || 'Cash',
      });
      setPaidMsg('Paid exchange and payment recorded.');
      reload();
    } catch (err) {
      setPaidErr(getUserFacingMessage(err, 'Paid exchange failed') + rollbackHint(err.status));
    } finally {
      setPaidBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Transaction demo</h1>
        <LoadingState label="Loading…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="crud-page">
        <h1>Transaction demo</h1>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    );
  }

  return (
    <div className="crud-page transaction-demo-page">
      <h1>Transaction demo</h1>
      <p className="muted">
        <strong>match-request</strong> creates an exchange and session in one database transaction;{' '}
        <strong>paid-exchange</strong> records payment for an existing exchange.
      </p>

      <section className="crud-form-card">
        <h2>1) Match request + session</h2>
        <p className="muted small">
          <strong>I teach:</strong> you are the teacher — pick <em>your</em> offer, then <em>their</em> open request for
          that <strong>same</strong> skill (they must want to learn what you teach).{' '}
          <strong>I learn:</strong> pick <em>your</em> open request, then <em>their</em> offer for that skill. You need a
          conversation with that peer first.
        </p>

        <form className="stack" onSubmit={handleMatchSubmit}>
          <div className="field">
            <span>Direction</span>
            <label className="inline">
              <input type="radio" checked={direction === 'teach'} onChange={() => setDirection('teach')} />I teach (my
              offer → their request)
            </label>
            <label className="inline">
              <input type="radio" checked={direction === 'learn'} onChange={() => setDirection('learn')} />I learn (their
              offer → my request)
            </label>
          </div>

          <div className="field">
            <label htmlFor="td-conv">Conversation</label>
            <select
              id="td-conv"
              value={conversationId}
              onChange={(e) => {
                setConversationId(e.target.value);
                setOfferId('');
                setRequestId('');
              }}
            >
              <option value="">Select…</option>
              {conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id}
                  {c.peerName ? ` with ${c.peerName}` : c.peerId != null ? ` (peer #${c.peerId})` : ''}
                </option>
              ))}
            </select>
          </div>

          {direction === 'teach' ? (
            <>
              <div className="field">
                <label htmlFor="td-offer">My offer</label>
                <select
                  id="td-offer"
                  value={offerId}
                  onChange={(e) => {
                    setOfferId(e.target.value);
                    setRequestId('');
                  }}
                >
                  <option value="">Select…</option>
                  {myOffers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.skillName} (#{o.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="td-req">Peer&apos;s open request (same skill)</label>
                <select
                  id="td-req"
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  disabled={!peerRequestsForTeach.length}
                >
                  <option value="">
                    {!offerId || peerId == null ? 'Select conversation and offer first…' : 'Select…'}
                  </option>
                  {peerRequestsForTeach.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.skillName} (#{r.id})
                    </option>
                  ))}
                </select>
                {offerId && peerId != null && !peerRequestsForTeach.length ? (
                  <span className="muted small">
                    Peer has no open request for <strong>{selectedOfferSkillName || 'this skill'}</strong> — add under{' '}
                    <strong>Requested skills</strong> or try <strong>I learn</strong>.
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="td-myreq">My open request</label>
                <select
                  id="td-myreq"
                  value={requestId}
                  onChange={(e) => {
                    setRequestId(e.target.value);
                    setOfferId('');
                  }}
                >
                  <option value="">Select…</option>
                  {myOpenRequests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.skillName} (#{r.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="td-peer-offer">Peer&apos;s offer (same skill)</label>
                <select
                  id="td-peer-offer"
                  value={offerId}
                  onChange={(e) => setOfferId(e.target.value)}
                  disabled={!peerOffersForLearn.length}
                >
                  <option value="">
                    {!requestId || peerId == null ? 'Select conversation and your request first…' : 'Select…'}
                  </option>
                  {peerOffersForLearn.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.skillName} (#{o.id})
                    </option>
                  ))}
                </select>
                {requestId && peerId != null && !peerOffersForLearn.length ? (
                  <span className="muted small">
                    Peer offers no <strong>{selectedMyRequestSkillName || 'this skill'}</strong> — check{' '}
                    <strong>Offered skills</strong> or switch to <strong>I teach</strong>.
                  </span>
                ) : null}
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="td-date">Date</label>
            <input id="td-date" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="td-t1">Start time</label>
            <input id="td-t1" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="td-t2">End time</label>
            <input id="td-t2" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="td-venue">Venue</label>
            <input id="td-venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Online or address" />
          </div>

          {matchErr ? (
            <p className="form-error" role="alert">
              {matchErr}
            </p>
          ) : null}
          {matchMsg ? (
            <p className="form-success" role="status">
              {matchMsg}
            </p>
          ) : null}

          <button type="submit" className="btn-primary" disabled={matchBusy || !matchRequestReady}>
            {matchBusy ? 'Running transaction…' : 'Run match-request'}
          </button>
        </form>
      </section>

      <section className="crud-form-card">
        <h2>2) Paid exchange + payment</h2>
        <p className="muted small">Record payment on an exchange you&apos;re in.</p>
        <form className="stack" onSubmit={handlePaidSubmit}>
          <div className="field">
            <label htmlFor="td-ex">Exchange</label>
            <select
              id="td-ex"
              value={paidExchangeId}
              onChange={(e) => setPaidExchangeId(e.target.value)}
            >
              <option value="">Select…</option>
              {exchanges.map((x) => (
                <option key={x.id} value={x.id}>
                  #{x.id} — {x.skillName ?? 'Skill'} — {x.status} ({x.exchangeType})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="td-price">Price (PKR)</label>
            <input
              id="td-price"
              type="number"
              min="0.01"
              step="0.01"
              value={paidPrice}
              onChange={(e) => setPaidPrice(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="td-pm">Payment method</label>
            <input
              id="td-pm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="Cash, JazCash, …"
            />
          </div>

          {paidErr ? (
            <p className="form-error" role="alert">
              {paidErr}
            </p>
          ) : null}
          {paidMsg ? (
            <p className="form-success" role="status">
              {paidMsg}
            </p>
          ) : null}

          <button type="submit" className="btn-primary" disabled={paidBusy}>
            {paidBusy ? 'Processing…' : 'Run paid-exchange'}
          </button>
        </form>
      </section>
    </div>
  );
}
