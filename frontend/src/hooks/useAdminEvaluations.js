import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

/**
 * University admin: read-only list of skill evaluations at this university.
 */
export function useAdminEvaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api('/api/v1/skill-evaluations');
      setEvaluations(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Failed to load evaluations'));
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    evaluations,
    loading,
    error,
    reload: load,
  };
}
