import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';
import { useConversationSocket } from './useConversationSocket';

/**
 * Form 2: confirm exchange + first session(s) for a conversation.
 * Exchange readiness is stored on the server; both students must PATCH ready before submit.
 * @param {string|number} conversationId
 */
export function useConfirmExchangeForm(conversationId) {
  const navigate = useNavigate();
  const cid = Number(conversationId);

  const [eligibility, setEligibility] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [readinessSaving, setReadinessSaving] = useState(false);
  const [readinessError, setReadinessError] = useState('');

  const [meetingType, setMeetingType] = useState('physical');
  const [venue, setVenue] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [platform, setPlatform] = useState('Zoom');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingPassword, setMeetingPassword] = useState('');

  const [priceTeach, setPriceTeach] = useState('');
  const [priceLearn, setPriceLearn] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!Number.isFinite(cid) || cid < 1) {
      setLoadError('Invalid conversation.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const res = await api(`/api/v1/matching/conversations/${cid}/form2-eligibility`);
      setEligibility(res.data ?? null);
    } catch (e) {
      setLoadError(getUserFacingMessage(e, 'Could not load options'));
      setEligibility(null);
    } finally {
      setLoading(false);
    }
  }, [cid]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onSocketReadiness = useCallback(() => {
    reload();
  }, [reload]);

  useConversationSocket(Number.isFinite(cid) && cid > 0 ? cid : null, null, onSocketReadiness);

  function combineDateTime(date, time) {
    if (!date || !time) return '';
    return `${date} ${time}:00`;
  }

  const patchMyReadiness = useCallback(
    async (ready) => {
      if (!Number.isFinite(cid) || cid < 1) return;
      setReadinessError('');
      setReadinessSaving(true);
      try {
        await api(`/api/v1/conversations/${cid}/exchange-readiness`, {
          method: 'PATCH',
          body: { ready },
        });
        await reload();
      } catch (e) {
        setReadinessError(getUserFacingMessage(e, 'Could not update readiness'));
      } finally {
        setReadinessSaving(false);
      }
    },
    [cid, reload]
  );

  const submit = useCallback(async () => {
    setSubmitError('');
    if (!eligibility?.exchangeReadiness?.bothReady) {
      setSubmitError('Both students must turn on “Ready to confirm exchange” in this chat (or on this page).');
      return;
    }
    const scheduledStart = combineDateTime(dateStr, startTime);
    const scheduledEnd = combineDateTime(dateStr, endTime);
    if (!scheduledStart || !scheduledEnd) {
      setSubmitError('Date, start time, and end time are required.');
      return;
    }
    if (!venue.trim()) {
      setSubmitError('Venue is required (use “Online” if needed).');
      return;
    }

    const teach = eligibility?.iTeachPeer;
    const learn = eligibility?.peerTeachesMe;

    /** @type {{ offerId: number, requestId: number, agreedPrice?: number }[]} */
    const pairs = [];
    /** @type {{ isPaid: boolean }[]} */
    const pairMeta = [];

    if (eligibility?.mutualSwapReady && teach && learn) {
      pairs.push({
        offerId: teach.offerId,
        requestId: teach.requestId,
        agreedPrice: teach.isPaid ? Number(priceTeach) || undefined : undefined,
      });
      pairMeta.push(teach);
      pairs.push({
        offerId: learn.offerId,
        requestId: learn.requestId,
        agreedPrice: learn.isPaid ? Number(priceLearn) || undefined : undefined,
      });
      pairMeta.push(learn);
    } else if (teach) {
      pairs.push({
        offerId: teach.offerId,
        requestId: teach.requestId,
        agreedPrice: teach.isPaid && priceTeach !== '' ? Number(priceTeach) : undefined,
      });
      pairMeta.push(teach);
    } else if (learn) {
      pairs.push({
        offerId: learn.offerId,
        requestId: learn.requestId,
        agreedPrice: learn.isPaid && priceLearn !== '' ? Number(priceLearn) : undefined,
      });
      pairMeta.push(learn);
    } else {
      setSubmitError('No eligible teach/learn pair found. Ensure requests are still open and skills still match.');
      return;
    }

    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      const meta = pairMeta[i];
      if (!p.offerId || !p.requestId) {
        setSubmitError('Missing offer or request IDs.');
        return;
      }
      if (meta.isPaid && (p.agreedPrice == null || Number(p.agreedPrice) <= 0)) {
        setSubmitError('Agreed price (PKR) is required for each paid exchange.');
        return;
      }
    }

    const body = {
      conversationId: cid,
      meetingType,
      venue: venue.trim(),
      scheduledStart,
      scheduledEnd,
      pairs,
    };

    if (meetingType === 'online') {
      body.videoSession = {
        platform,
        meetingLink: meetingLink.trim() || undefined,
        meetingPassword: meetingPassword.trim() || undefined,
      };
    }

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
    dateStr,
    startTime,
    endTime,
    venue,
    meetingType,
    platform,
    meetingLink,
    meetingPassword,
    priceTeach,
    priceLearn,
    cid,
    navigate,
  ]);

  return {
    eligibility,
    loadError,
    loading,
    reload,
    readinessSaving,
    readinessError,
    patchMyReadiness,
    meetingType,
    setMeetingType,
    venue,
    setVenue,
    dateStr,
    setDateStr,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    platform,
    setPlatform,
    meetingLink,
    setMeetingLink,
    meetingPassword,
    setMeetingPassword,
    priceTeach,
    setPriceTeach,
    priceLearn,
    setPriceLearn,
    submitError,
    submitting,
    submit,
  };
}
