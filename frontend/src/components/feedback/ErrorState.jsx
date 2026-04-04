/**
 * @param {{ message: string, onRetry?: () => void, retryLabel?: string }} props
 */
export function ErrorState({ message, onRetry, retryLabel = 'Try again' }) {
  return (
    <div className="error-state" role="alert">
      <p className="form-error">{message}</p>
      {typeof onRetry === 'function' ? (
        <p>
          <button type="button" className="btn-secondary" onClick={onRetry}>
            {retryLabel}
          </button>
        </p>
      ) : null}
    </div>
  );
}
