import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { getUserFacingMessage } from '../../lib/apiErrors';

/**
 * Load mutual matches for one open RequestedSkill row; open chat with a peer.
 */
export function RequestPeersForRow({ requestId, skillName, preferredMode }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('idle');
  const [peers, setPeers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [openingId, setOpeningId] = useState(null);
  const [openError, setOpenError] = useState('');

  async function loadPeers() {
    setLoadError('');
    setOpenError('');
    setPhase('loading');
    try {
      const res = await api(`/api/v1/matching/requests/${requestId}/matches`);
      setPeers(Array.isArray(res.data) ? res.data : []);
      setPhase('done');
    } catch (e) {
      setLoadError(getUserFacingMessage(e, 'Could not load matches'));
      setPhase('error');
    }
  }

  async function openChat(peerStudentId) {
    setOpenError('');
    setOpeningId(peerStudentId);
    try {
      const res = await api('/api/v1/conversations/get-or-create', {
        method: 'POST',
        body: { otherStudentId: peerStudentId },
      });
      if (res.data?.id != null) navigate('/student/conversations');
    } catch (e) {
      setOpenError(getUserFacingMessage(e, 'Could not open conversation'));
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="request-peer-matches card-like">
      <p className="muted small">
        {preferredMode === 'Paid' ? (
          <>
            <strong>Paid:</strong> their rate is shown; pick a row to chat.
          </>
        ) : (
          <>
            <strong>Free exchange:</strong> peers who offer {skillName} (free) and match your swap.
          </>
        )}
      </p>
      {phase === 'idle' || phase === 'error' ? (
        <p>
          <button type="button" className="btn-secondary" onClick={loadPeers}>
            {phase === 'error' ? 'Retry' : 'Show matching students'}
          </button>
        </p>
      ) : null}
      {phase === 'loading' ? <p className="muted">Loading…</p> : null}
      {loadError ? (
        <p className="form-error" role="alert">
          {loadError}
        </p>
      ) : null}
      {openError ? (
        <p className="form-error" role="alert">
          {openError}
        </p>
      ) : null}
      {phase === 'done' && peers.length === 0 ? (
        <p className="muted">
          {preferredMode === 'Paid' ? (
            <>No paid offers for {skillName} at your university, or request not open.</>
          ) : (
            <>No matches — needs a peer offering {skillName} (free) who wants something you offer.</>
          )}
        </p>
      ) : null}
      {peers.length > 0 ? (
        <ul className="match-suggestions">
          {peers.map((p) => (
            <li key={`${p.studentId}-${p.offerId ?? 'x'}`} className="match-suggestion card-like">
              <span>
                <strong>{p.fullName}</strong>
                <span className="muted"> — ID {p.studentId}</span>
                {preferredMode === 'Paid' ? (
                  <span className="offer-price-tag">
                    {p.pricePerHour != null && Number.isFinite(Number(p.pricePerHour)) ? (
                      <> · <strong>{Number(p.pricePerHour)} PKR/hr</strong></>
                    ) : (
                      <> · price not set on offer</>
                    )}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                className="btn-primary"
                disabled={openingId != null}
                onClick={() => openChat(p.studentId)}
              >
                {openingId === p.studentId ? 'Opening…' : 'Open chat'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
