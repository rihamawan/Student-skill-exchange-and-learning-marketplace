import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

/**
 * Monthly exchange counts from GET /api/v1/reports/exchange-trend
 */
export function useReportExchangeTrend(months = 12) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/api/v1/reports/exchange-trend?months=${months}`);
      const s = res.data?.series;
      setSeries(Array.isArray(s) ? s : []);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Could not load exchange trend'));
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    void load();
  }, [load]);

  return { series, loading, error, reload: load };
}
