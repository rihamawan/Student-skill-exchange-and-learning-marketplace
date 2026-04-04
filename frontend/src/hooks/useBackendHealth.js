import { useCallback, useEffect, useState } from 'react';
import { baseUrl } from '../lib/api';

/**
 * Lightweight ping of GET /api/v1/health (no auth). For global “API offline” banner.
 * @param {number} pollMs - interval between checks when tab is visible
 */
export function useBackendHealth(pollMs = 45000) {
  const [status, setStatus] = useState('checking');

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/v1/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      setStatus(res.ok ? 'ok' : 'down');
    } catch {
      setStatus('down');
    }
  }, []);

  useEffect(() => {
    void check();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void check();
    }, pollMs);
    function onVisible() {
      if (document.visibilityState === 'visible') void check();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check, pollMs]);

  return { status, recheck: check };
}
