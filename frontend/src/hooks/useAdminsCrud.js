import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * Superadmin: admin users CRUD.
 */
export function useAdminsCrud() {
  const [admins, setAdmins] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [aRes, uRes] = await Promise.all([
        api('/api/v1/admins'),
        api('/api/v1/universities', { skipAuthRedirect: true }),
      ]);
      setAdmins(Array.isArray(aRes.data) ? aRes.data : []);
      setUniversities(Array.isArray(uRes.data) ? uRes.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load admins');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createAdmin = useCallback(
    async (body) => {
      setBusy(true);
      setError('');
      try {
        await api('/api/v1/admins', { method: 'POST', body });
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

  const updateAdmin = useCallback(
    async (id, body) => {
      setBusy(true);
      setError('');
      try {
        await api(`/api/v1/admins/${id}`, { method: 'PUT', body });
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

  const removeAdmin = useCallback(
    async (id) => {
      setBusy(true);
      setError('');
      try {
        await api(`/api/v1/admins/${id}`, { method: 'DELETE' });
        await load();
      } catch (e) {
        setError(e.message || 'Remove failed');
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  return { admins, universities, loading, error, reload: load, createAdmin, updateAdmin, removeAdmin, busy };
}
