import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

/**
 * Profile & matching: mutual match list + optional check by peer name (same university). Offers/requests: Offered / Requested skills tabs.
 */
export function useMatchIntakeForm() {
  const navigate = useNavigate();

  const [otherStudentName, setOtherStudentName] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError] = useState('');
  const [checking, setChecking] = useState(false);

  const [openError, setOpenError] = useState('');
  const [opening, setOpening] = useState(false);

  const [mutualMatches, setMutualMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [matchesError, setMatchesError] = useState('');

  const loadMutualMatches = useCallback(async () => {
    setMatchesError('');
    setLoadingMatches(true);
    try {
      const res = await api('/api/v1/matching/matches');
      setMutualMatches(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setMatchesError(getUserFacingMessage(e, 'Could not load matching students'));
      setMutualMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    void loadMutualMatches();
  }, [loadMutualMatches]);

  const checkMatch = useCallback(async () => {
    setCheckError('');
    setCheckResult(null);
    const q = otherStudentName.trim();
    if (q.length < 2) {
      setCheckError('Enter at least 2 characters of the other student’s name.');
      return;
    }
    setChecking(true);
    try {
      const res = await api(
        `/api/v1/matching/check?otherStudentName=${encodeURIComponent(q)}`
      );
      setCheckResult(res.data ?? null);
    } catch (e) {
      setCheckError(getUserFacingMessage(e, 'Check failed'));
    } finally {
      setChecking(false);
    }
  }, [otherStudentName]);

  const openConversationWithPeer = useCallback(
    async (peerStudentId) => {
      setOpenError('');
      const other = Number(peerStudentId);
      if (!Number.isFinite(other) || other < 1) {
        setOpenError('Invalid student.');
        return;
      }
      setOpening(true);
      try {
        const res = await api('/api/v1/conversations/get-or-create', {
          method: 'POST',
          body: { otherStudentId: other },
        });
        if (res.data?.id != null) navigate('/student/conversations');
      } catch (e) {
        setOpenError(getUserFacingMessage(e, 'Could not open conversation'));
      } finally {
        setOpening(false);
      }
    },
    [navigate]
  );

  const openConversation = useCallback(async () => {
    const peerId = checkResult?.otherStudentId;
    if (peerId == null || !checkResult?.matched) {
      setOpenError('Run a successful mutual match check first.');
      return;
    }
    await openConversationWithPeer(Number(peerId));
  }, [checkResult, openConversationWithPeer]);

  return {
    otherStudentName,
    setOtherStudentName,
    checkResult,
    checkError,
    checking,
    checkMatch,
    openError,
    opening,
    openConversation,
    openConversationWithPeer,
    mutualMatches,
    loadingMatches,
    matchesError,
    loadMutualMatches,
  };
}
