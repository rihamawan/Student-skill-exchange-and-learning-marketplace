import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

/**
 * Profile & matching: mutual match list + optional check by student ID. Offers/requests: Offered / Requested skills tabs.
 */
export function useMatchIntakeForm() {
  const navigate = useNavigate();

  const [otherStudentId, setOtherStudentId] = useState('');
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
    const other = Number(otherStudentId);
    if (!Number.isFinite(other) || other < 1) {
      setCheckError('Enter the other student’s numeric ID.');
      return;
    }
    setChecking(true);
    try {
      const res = await api(`/api/v1/matching/check?otherStudentId=${other}`);
      setCheckResult(res.data ?? null);
    } catch (e) {
      setCheckError(getUserFacingMessage(e, 'Check failed'));
    } finally {
      setChecking(false);
    }
  }, [otherStudentId]);

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
    await openConversationWithPeer(Number(otherStudentId));
  }, [otherStudentId, openConversationWithPeer]);

  return {
    otherStudentId,
    setOtherStudentId,
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
