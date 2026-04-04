import { useBackendHealth } from '../../hooks/useBackendHealth';

export function BackendStatusBanner() {
  const { status, recheck } = useBackendHealth();

  if (status !== 'down') return null;

  return (
    <div className="backend-status-banner" role="status">
      <span>
        Can't reach the API server. Features that load data will fail until the backend is running.
      </span>{' '}
      <button type="button" className="backend-status-banner__retry" onClick={() => void recheck()}>
        Check again
      </button>
    </div>
  );
}
