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
    const body = {
      fullName: fullName.trim(),
      universityId: uid,
      offered: offered.map((o) => ({
        skillId: Number(o.skillId),
        isPaid: Boolean(o.isPaid),
        pricePerHour: o.isPaid && o.pricePerHour !== '' ? Number(o.pricePerHour) : null,
      })),
      requested: requested.map((r) => ({
        skillId: Number(r.skillId),
        preferredTime: r.preferredTime,
        preferredMode: r.preferredMode,
      })),
    };
    return body;
  }, [fullName, universityId, offered, requested]);

  const submitForm1 = useCallback(async () => {
    setSaveError('');
    setSaving(true);
    try {
      const body = buildPayload();
      await api('/api/v1/matching/form1', { method: 'POST', body });
    } catch (e) {
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [buildPayload]);

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

  const openConversation = useCallback(async () => {
    setOpenError('');
    const other = Number(otherStudentId);
    if (!Number.isFinite(other) || other < 1) {
      setOpenError('Enter the other student’s numeric ID.');
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
  }, [otherStudentId, navigate]);

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
  };
}
