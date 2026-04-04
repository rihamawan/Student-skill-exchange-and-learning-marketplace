import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

const STATUS_OPTIONS = ['pending', 'in-progress', 'submitted', 'graded'];

/**
 * University admin: evaluations at my university + create + update.
 */
export function useAdminEvaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [students, setStudents] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadRefs = useCallback(async () => {
    const [stuRes, skRes] = await Promise.all([
      api('/api/v1/admin/students'),
      api('/api/v1/skills'),
    ]);
    setStudents(Array.isArray(stuRes.data) ? stuRes.data : []);
    setSkills(Array.isArray(skRes.data) ? skRes.data : []);
  }, []);

  const loadEvaluations = useCallback(async () => {
    const res = await api('/api/v1/skill-evaluations');
    setEvaluations(Array.isArray(res.data) ? res.data : []);
  }, []);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await Promise.all([loadRefs(), loadEvaluations()]);
    } catch (e) {
      setError(e.message || 'Failed to load evaluations');
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  }, [loadRefs, loadEvaluations]);

  useEffect(() => {
    void load();
  }, [load]);

  const createEvaluation = useCallback(
    async (studentId, skillId) => {
      setError('');
      await api('/api/v1/skill-evaluations', {
        method: 'POST',
        body: { studentId, skillId },
      });
      await loadEvaluations();
    },
    [loadEvaluations]
  );

  const updateEvaluation = useCallback(
    async (id, patch) => {
      setBusyId(id);
      setError('');
      try {
        await api(`/api/v1/skill-evaluations/${id}`, {
          method: 'PATCH',
          body: patch,
        });
        await loadEvaluations();
      } catch (e) {
        setError(e.message || 'Update failed');
      } finally {
        setBusyId(null);
      }
    },
    [loadEvaluations]
  );

  return {
    evaluations,
    students,
    skills,
    loading,
    error,
    reload: load,
    createEvaluation,
    updateEvaluation,
    busyId,
    statusOptions: STATUS_OPTIONS,
  };
}
