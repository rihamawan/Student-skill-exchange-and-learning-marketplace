import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const PREFERRED_TIMES = ['Morning', 'Evenings', 'Weekdays', 'Weekends', 'Flexible'];

function defaultOfferedRow() {
  return { skillId: '', isPaid: false, pricePerHour: '' };
}

function defaultRequestedRow() {
  return { skillId: '', preferredTime: 'Flexible', preferredMode: 'Exchange' };
}

/**
 * Form 1: match profile + optional check/open conversation with another student.
 * @param {{ initialFullName?: string }} opts
 */
export function useMatchIntakeForm(opts = {}) {
  const navigate = useNavigate();
  const { initialFullName = '' } = opts;

  const [universities, setUniversities] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [fullName, setFullName] = useState(initialFullName);
  const [universityId, setUniversityId] = useState('');
  const [offered, setOffered] = useState([defaultOfferedRow()]);
  const [requested, setRequested] = useState([defaultRequestedRow()]);

  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [otherStudentId, setOtherStudentId] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError] = useState('');
  const [checking, setChecking] = useState(false);

  const [openError, setOpenError] = useState('');
  const [opening, setOpening] = useState(false);

  const [mutualMatches, setMutualMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchesError, setMatchesError] = useState('');

  const loadMutualMatches = useCallback(async () => {
    setMatchesError('');
    setLoadingMatches(true);
    try {
      const res = await api('/api/v1/matching/matches');
      setMutualMatches(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setMatchesError(e.message || 'Could not load matching students');
      setMutualMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRefs(true);
      setLoadError('');
      try {
        const [uniRes, skillRes] = await Promise.all([
          api('/api/v1/universities', { skipAuthRedirect: true }),
          api('/api/v1/skills'),
        ]);
        if (!cancelled) {
          setUniversities(Array.isArray(uniRes.data) ? uniRes.data : []);
          setSkills(Array.isArray(skillRes.data) ? skillRes.data : []);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e.message || 'Could not load universities or skills');
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loadingRefs) {
      void loadMutualMatches();
    }
  }, [loadingRefs, loadMutualMatches]);

  useEffect(() => {
    if (initialFullName && !fullName) setFullName(initialFullName);
  }, [initialFullName, fullName]);

  const updateOffered = useCallback((index, patch) => {
    setOffered((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const addOffered = useCallback(() => {
    setOffered((prev) => [...prev, defaultOfferedRow()]);
  }, []);

  const removeOffered = useCallback((index) => {
    setOffered((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const updateRequested = useCallback((index, patch) => {
    setRequested((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const addRequested = useCallback(() => {
    setRequested((prev) => [...prev, defaultRequestedRow()]);
  }, []);

  const removeRequested = useCallback((index) => {
    setRequested((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const buildPayload = useCallback(() => {
    const uid = Number(universityId);
    const offeredRows = offered.filter(
      (o) => o.skillId !== '' && Number.isFinite(Number(o.skillId)) && Number(o.skillId) >= 1
    );
    const requestedRows = requested.filter(
      (r) => r.skillId !== '' && Number.isFinite(Number(r.skillId)) && Number(r.skillId) >= 1
    );
    const body = {
      fullName: fullName.trim(),
      universityId: uid,
      offered: offeredRows.map((o) => {
        const row = {
          skillId: Number(o.skillId),
          isPaid: Boolean(o.isPaid),
        };
        if (o.isPaid) {
          row.pricePerHour =
            o.pricePerHour === '' ? 0 : Number(o.pricePerHour);
        }
        return row;
      }),
      requested: requestedRows.map((r) => ({
        skillId: Number(r.skillId),
        preferredTime: r.preferredTime,
        preferredMode: r.preferredMode,
      })),
    };
    return body;
  }, [fullName, universityId, offered, requested]);

  const submitForm1 = useCallback(async () => {
    setSaveError('');
    if (!fullName.trim()) {
      setSaveError('Enter your full name.');
      return;
    }
    const uid = Number(universityId);
    if (!Number.isFinite(uid) || uid < 1) {
      setSaveError('Select your university.');
      return;
    }
    const offeredRows = offered.filter(
      (o) => o.skillId !== '' && Number.isFinite(Number(o.skillId)) && Number(o.skillId) >= 1
    );
    const requestedRows = requested.filter(
      (r) => r.skillId !== '' && Number.isFinite(Number(r.skillId)) && Number(r.skillId) >= 1
    );
    if (offeredRows.length === 0) {
      setSaveError('Add at least one offered skill and choose a skill in each row (or remove empty rows).');
      return;
    }
    if (requestedRows.length === 0) {
      setSaveError('Add at least one wanted skill and choose a skill in each row (or remove empty rows).');
      return;
    }
    for (const o of offeredRows) {
      if (o.isPaid) {
        const p = o.pricePerHour === '' ? NaN : Number(o.pricePerHour);
        if (!Number.isFinite(p) || p < 0) {
          setSaveError('Paid offers need a valid price per hour (0 or more).');
          return;
        }
      }
    }
    setSaving(true);
    try {
      const body = buildPayload();
      await api('/api/v1/matching/form1', { method: 'POST', body });
      await loadMutualMatches();
    } catch (e) {
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [buildPayload, fullName, universityId, offered, requested, loadMutualMatches]);

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
      setCheckError(e.message || 'Check failed');
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
        const id = res.data?.id;
        if (id != null) navigate(`/student/conversations`);
      } catch (e) {
        setOpenError(e.message || 'Could not open conversation');
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
    universities,
    skills,
    loadError,
    loadingRefs,
    preferredTimes: PREFERRED_TIMES,
    fullName,
    setFullName,
    universityId,
    setUniversityId,
    offered,
    updateOffered,
    addOffered,
    removeOffered,
    requested,
    updateRequested,
    addRequested,
    removeRequested,
    saveError,
    saving,
    submitForm1,
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
