import { useEffect, useState } from 'react';
import { LoadingState } from '../feedback/LoadingState';
import { api } from '../../lib/api';
import { getUserFacingMessage } from '../../lib/apiErrors';
import { PendingVerificationPage } from '../../pages/PendingVerificationPage';

export function RequireStudentVerified({ children }) {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api('/api/v1/students/me/verification');
        const v = Boolean(res?.data?.verified);
        if (!cancelled) {
          setVerified(v);
        }
      } catch (e) {
        if (!cancelled) {
          setError(getUserFacingMessage(e, 'Failed to load verification state'));
          setVerified(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <LoadingState label="Loading…" />
      </div>
    );
  }

  if (!verified) {
    return <PendingVerificationPage message={error || undefined} />;
  }

  return children;
}

