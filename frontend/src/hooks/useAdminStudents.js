import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

/**
 * University admin: students at my university + verify toggle.
 */
export function useAdminStudents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api('/api/v1/admin/students');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Failed to load students'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setVerified = useCallback(
    async (id, verified) => {
      setSavingId(id);
      setError('');
      try {
        await api(`/api/v1/admin/students/${id}/verify`, {
          method: 'PATCH',
          body: { verified },
        });
        await load();
      } catch (e) {
        setError(getUserFacingMessage(e, 'Could not update verification'));
      } finally {
        setSavingId(null);
      }
    },
    [load]
  );

  return { items, loading, error, reload: load, setVerified, savingId };
}
