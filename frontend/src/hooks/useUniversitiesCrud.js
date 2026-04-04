import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * Superadmin: full CRUD for universities.
 */
export function useUniversitiesCrud() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api('/api/v1/universities', { skipAuthRedirect: true });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load universities');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (payload) => {
      setBusy(true);
      setError('');
      try {
        await api('/api/v1/universities', { method: 'POST', body: payload });
        await load();
      } catch (e) {
        setError(e.message || 'Create failed');
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const update = useCallback(
    async (id, payload) => {
      setBusy(true);
      setError('');
      try {
        await api(`/api/v1/universities/${id}`, { method: 'PUT', body: payload });
        await load();
      } catch (e) {
        setError(e.message || 'Update failed');
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const remove = useCallback(
    async (id) => {
      setBusy(true);
      setError('');
      try {
        await api(`/api/v1/universities/${id}`, { method: 'DELETE' });
        await load();
      } catch (e) {
        setError(e.message || 'Delete failed');
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  return { items, loading, error, reload: load, create, update, remove, busy };
}
