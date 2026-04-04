import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

/** @param {object} conv @param {number|null} myUserId */
export function peerFromConversation(conv, myUserId) {
  const me = Number(myUserId);
  const s1 = Number(conv.student1Id);
  const s2 = Number(conv.student2Id);
  if (!Number.isFinite(me)) return null;
  if (s1 === me) return s2;
  if (s2 === me) return s1;
  return null;
}

export function useTransactionDemo() {
  const [conversations, setConversations] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [allOffers, setAllOffers] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [c, mo, ao, mr, or, ex] = await Promise.all([
        api('/api/v1/conversations'),
        api('/api/v1/offered-skills?mine=true'),
        api('/api/v1/offered-skills'),
        api('/api/v1/requested-skills?mine=true'),
        api('/api/v1/requested-skills'),
        api('/api/v1/exchanges'),
      ]);
      setConversations(Array.isArray(c.data) ? c.data : []);
      setMyOffers(Array.isArray(mo.data) ? mo.data : []);
      setAllOffers(Array.isArray(ao.data) ? ao.data : []);
      setMyRequests(Array.isArray(mr.data) ? mr.data : []);
      setOpenRequests(Array.isArray(or.data) ? or.data : []);
      setExchanges(Array.isArray(ex.data) ? ex.data : []);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runMatchRequest = useCallback(async (body) => {
    return api('/api/v1/transactions/match-request', { method: 'POST', body });
  }, []);

  const runPaidExchange = useCallback(async (body) => {
    return api('/api/v1/transactions/paid-exchange', { method: 'POST', body });
  }, []);

  return {
    conversations,
    myOffers,
    allOffers,
    myRequests,
    openRequests,
    exchanges,
    loading,
    error,
    reload: load,
    runMatchRequest,
    runPaidExchange,
  };
}
