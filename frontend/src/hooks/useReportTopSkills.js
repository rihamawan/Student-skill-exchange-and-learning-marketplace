import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

export function useReportTopSkills(limit = 10) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/api/v1/reports/top-skills?limit=${limit}`);
      const s = res.data?.skills;
      setSkills(Array.isArray(s) ? s : []);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Could not load top skills'));
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { skills, loading, error, reload: load };
}
