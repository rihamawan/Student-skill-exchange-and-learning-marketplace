import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

/**
 * Monthly payment series from GET /api/v1/reports/payment-trend
 */
export function useReportPaymentTrend(months = 12) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/api/v1/reports/payment-trend?months=${months}`);
      const s = res.data?.series;
      setSeries(Array.isArray(s) ? s : []);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Could not load payment trend'));
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
