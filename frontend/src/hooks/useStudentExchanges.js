import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

const STATUS_OPTIONS = ['pending', 'active', 'completed', 'cancelled'];

export function useStudentExchanges() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api('/api/v1/exchanges');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load exchanges');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const updateStatus = useCallback(
    async (exchangeId, status) => {
      setSavingId(exchangeId);
      try {
        await api(`/api/v1/exchanges/${exchangeId}/status`, {
          method: 'PATCH',
          body: { status },
        });
        await load();
      } finally {
        setSavingId(null);
      }
    },
    [load]
  );

  return {
    items,
    loading,
    error,
    savingId,
    reload: load,
    updateStatus,
    statusOptions: STATUS_OPTIONS,
  };
}
