/**
 * Map API/network errors to short, user-facing copy (no stack traces or raw fetch strings).
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function getUserFacingMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error == null || error === '') return fallback;
  if (typeof error === 'string') return error || fallback;

  const code = error.code;
  const status = error.status;
  const name = error.name;
  const msg = typeof error.message === 'string' ? error.message : '';

  const networkMsg =
    "Can't reach the server. Check that the API is running and your network, then try again.";

  if (code === 'NETWORK') return networkMsg;
  if (name === 'TypeError' && msg.toLowerCase().includes('fetch')) return networkMsg;

  if (status === 503 || status === 502 || status === 504) {
    return 'The server is temporarily unavailable. Please try again in a moment.';
  }

  if (status === 500) {
    if (msg && !/^Request failed \(\d+\)$/.test(msg)) return msg;
    return 'Something went wrong on the server. Please try again later.';
  }

  if (status === 400 || status === 422 || status === 409) {
    return msg || fallback;
  }

  if (status === 404) {
    return msg && !/^Request failed/.test(msg) ? msg : 'Not found.';
  }

  if (msg) {
    if (/^Request failed \(\d+\)$/.test(msg)) return fallback;
    if (msg.length > 280) return fallback;
    return msg;
  }

  return fallback;
}

/** True when `api()` failed before an HTTP response (offline, wrong host, CORS, etc.). */
export function isNetworkError(error) {
  if (error == null || typeof error !== 'object') return false;
  return error.code === 'NETWORK';
}
