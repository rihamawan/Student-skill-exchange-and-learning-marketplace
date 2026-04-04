import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

/**
 * @param {boolean} enabled - Only fetch for superadmin (avoids 403 for university admins).
 */
export function useReportUniversityLeaderboard(enabled, limit = 10) {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) {
      setUniversities([]);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api(`/api/v1/reports/university-leaderboard?limit=${limit}`);
      const u = res.data?.universities;
      setUniversities(Array.isArray(u) ? u : []);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Could not load leaderboard'));
      setUniversities([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { universities, loading, error, reload: load };
}
