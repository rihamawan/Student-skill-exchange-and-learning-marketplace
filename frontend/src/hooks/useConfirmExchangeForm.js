import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';
import { useConversationSocket } from './useConversationSocket';

function combineDateTime(date, time) {
  if (!date || !time) return '';
  return `${date} ${time}:00`;
}

function emptyLegSession() {
  return {
    venue: '',
    dateStr: '',
    startTime: '',
    endTime: '',
    meetingType: 'physical',
    platform: 'Zoom',
    meetingLink: '',
    meetingPassword: '',
    price: '',
  };
}

/**
 * Form 2: bundle picker, per-bundle readiness, per-request session fields (B1).
 */
export function useConfirmExchangeForm(conversationId) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const myId = user?.id != null ? Number(user.id) : null;
  const cid = Number(conversationId);

  const [eligibility, setEligibility] = useState(null);
  const [selectedBundleKey, setSelectedBundleKey] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [readinessSaving, setReadinessSaving] = useState(false);
  const [readinessError, setReadinessError] = useState('');
  /** @type {Record<number, ReturnType<typeof emptyLegSession>>} */
  const [legSessions, setLegSessions] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');

  const reload = useCallback(async () => {
    if (!Number.isFinite(cid) || cid < 1) {
      setLoadError('Invalid conversation.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const q =
        selectedBundleKey && selectedBundleKey.length > 0
          ? `?bundleKey=${encodeURIComponent(selectedBundleKey)}`
          : '';
      const res = await api(`/api/v1/matching/conversations/${cid}/form2-eligibility${q}`);
      const data = res.data ?? null;
      setEligibility(data);
      if (data?.bundles?.length) {
        const keys = data.bundles.map((b) => b.bundleKey);
        if (!selectedBundleKey || !keys.includes(selectedBundleKey)) {
          setSelectedBundleKey(data.bundles[0].bundleKey);
        }
      }
      if (data?.draftsByRequestId) {
        setLegSessions((prev) => {
          const next = { ...prev };
          for (const [ridStr, d] of Object.entries(data.draftsByRequestId)) {
            const rid = Number(ridStr);
            if (!Number.isFinite(rid)) continue;
            const start = d.scheduledStart ? String(d.scheduledStart).slice(0, 19) : '';
            const datePart = start ? start.slice(0, 10) : '';
            const timePart = start.length >= 16 ? start.slice(11, 16) : '';
            const end = d.scheduledEnd ? String(d.scheduledEnd).slice(11, 16) : '';
            next[rid] = {
              venue: d.venue ?? '',
              dateStr: datePart,
              startTime: timePart,
              endTime: end,
              meetingType: d.meetingType === 'online' ? 'online' : 'physical',
              platform: d.platform ?? 'Zoom',
              meetingLink: d.meetingLink ?? '',
              meetingPassword: d.meetingPassword ?? '',
              price: d.agreedPrice != null ? String(d.agreedPrice) : '',
            };
          }
          return next;
        });
      }
    } catch (e) {
      setLoadError(getUserFacingMessage(e, 'Could not load options'));
      setEligibility(null);
    } finally {
      setLoading(false);
    }
  }, [cid, selectedBundleKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onSocketReadiness = useCallback(() => {
    reload();
  }, [reload]);

  useConversationSocket(Number.isFinite(cid) && cid > 0 ? cid : null, null, onSocketReadiness);

  const selectedBundle = eligibility?.bundles?.find((b) => b.bundleKey === selectedBundleKey) ?? null;

  useEffect(() => {
    if (!selectedBundle?.legs) return;
    setLegSessions((prev) => {
      const next = { ...prev };
      for (const leg of selectedBundle.legs) {
        if (next[leg.requestId] == null) {
          next[leg.requestId] = emptyLegSession();
        }
      }
      return next;
    });
  }, [selectedBundleKey, selectedBundle]);

  const patchMyReadiness = useCallback(
    async (ready) => {
      if (!Number.isFinite(cid) || cid < 1 || !selectedBundleKey) return;
      setReadinessError('');
      setReadinessSaving(true);
      try {
        await api(`/api/v1/conversations/${cid}/exchange-readiness`, {
          method: 'PATCH',
          body: { ready, bundleKey: selectedBundleKey },
        });
        await reload();
      } catch (e) {
        setReadinessError(getUserFacingMessage(e, 'Could not update readiness'));
      } finally {
        setReadinessSaving(false);
      }
    },
    [cid, selectedBundleKey, reload]
  );

  const updateLegSession = useCallback((requestId, patch) => {
    const rid = Number(requestId);
    setLegSessions((prev) => ({
      ...prev,
      [rid]: { ...(prev[rid] ?? emptyLegSession()), ...patch },
    }));
  }, []);

  const saveDraftForRequest = useCallback(
    async (requestId) => {
      if (!selectedBundleKey || !Number.isFinite(cid)) return;
      const rid = Number(requestId);
      const s = legSessions[rid] ?? emptyLegSession();
      const scheduledStart = combineDateTime(s.dateStr, s.startTime);
      const scheduledEnd = combineDateTime(s.dateStr, s.endTime);
      setDraftSaving(true);
      setDraftMessage('');
      try {
        await api(`/api/v1/matching/conversations/${cid}/form2-draft`, {
          method: 'PUT',
          body: {
            bundleKey: selectedBundleKey,
            requestId: rid,
            venue: s.venue,
            scheduledStart: scheduledStart || undefined,
            scheduledEnd: scheduledEnd || undefined,
            meetingType: s.meetingType,
            platform: s.meetingType === 'online' ? s.platform : undefined,
            meetingLink: s.meetingLink || undefined,
            meetingPassword: s.meetingPassword || undefined,
            agreedPrice: s.price !== '' ? Number(s.price) : undefined,
          },
        });
        setDraftMessage('Draft saved.');
        setTimeout(() => setDraftMessage(''), 2500);
      } catch (e) {
        setDraftMessage(getUserFacingMessage(e, 'Could not save draft'));
      } finally {
        setDraftSaving(false);
      }
    },
    [cid, selectedBundleKey, legSessions]
  );

  const submit = useCallback(async () => {
    setSubmitError('');
    if (!eligibility?.exchangeReadiness?.bothReady) {
      setSubmitError('Both students must turn on readiness for this exchange bundle.');
      return;
    }
    if (!selectedBundle || !selectedBundleKey) {
      setSubmitError('Select an exchange bundle.');
      return;
    }
    if (myId == null || !Number.isFinite(myId)) {
      setSubmitError('Not signed in.');
      return;
    }

    const pairs = [];
    for (const leg of selectedBundle.legs) {
      const rid = leg.requestId;
      const s = legSessions[rid] ?? emptyLegSession();
      const scheduledStart = combineDateTime(s.dateStr, s.startTime);
      const scheduledEnd = combineDateTime(s.dateStr, s.endTime);
      const venue = (s.venue ?? '').trim();
      if (!venue || !scheduledStart || !scheduledEnd) {
        setSubmitError(
          `Each session needs venue, date, and times. Missing details for request #${rid} (${leg.skillName ?? 'skill'}). If this is your peer’s session, wait until they save a draft, then refresh.`
        );
        return;
      }
      const mt = s.meetingType === 'online' ? 'online' : 'physical';
      if (mt === 'online' && !String(s.platform ?? '').trim()) {
        setSubmitError(`Platform is required for online session (request #${rid}).`);
        return;
      }
      if (leg.isPaid) {
        const pr = s.price !== '' ? Number(s.price) : NaN;
        if (!Number.isFinite(pr) || pr <= 0) {
          setSubmitError(`Agreed price required for paid exchange (request #${rid}).`);
          return;
        }
      }

      pairs.push({
        offerId: leg.offerId,
        requestId: leg.requestId,
        agreedPrice: leg.isPaid ? Number(s.price) : undefined,
        scheduledStart,
        scheduledEnd,
        venue,
        meetingType: mt,
        videoSession:
          mt === 'online'
            ? {
                platform: s.platform.trim(),
                meetingLink: s.meetingLink?.trim() || undefined,
                meetingPassword: s.meetingPassword?.trim() || undefined,
              }
            : undefined,
      });
    }

    const body = {
      conversationId: cid,
      bundleKey: selectedBundleKey,
      pairs,
    };

    setSubmitting(true);
    try {
      await api('/api/v1/transactions/confirm-form2', { method: 'POST', body });
      navigate('/student/exchanges');
    } catch (e) {
      setSubmitError(getUserFacingMessage(e, 'Submit failed'));
    } finally {
      setSubmitting(false);
    }
  }, [
    eligibility,
    selectedBundle,
    selectedBundleKey,
    legSessions,
    myId,
    cid,
    navigate,
  ]);

  return {
    eligibility,
    selectedBundleKey,
    setSelectedBundleKey,
    selectedBundle,
    loadError,
    loading,
    reload,
    readinessSaving,
    readinessError,
    patchMyReadiness,
    legSessions,
    updateLegSession,
    saveDraftForRequest,
    draftSaving,
    draftMessage,
    submitError,
    submitting,
    submit,
    myStudentId: myId,
  };
}
