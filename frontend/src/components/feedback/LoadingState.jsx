/**
 * @param {{ label?: string }} props
 */
export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
