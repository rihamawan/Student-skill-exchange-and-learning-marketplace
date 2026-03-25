import { clearStoredAuth, getStoredToken, getStoredUser } from './authStorage';
import { dashboardPathForRole, isValidRole } from './roles';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

/**
 * @param {string} path - e.g. /api/v1/auth/login
 * @param {RequestInit & { skipAuthRedirect?: boolean }} [options]
 */
export async function api(path, options = {}) {
  const { skipAuthRedirect = false, headers: hdrs, ...rest } = options;
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = {
    Accept: 'application/json',
    ...hdrs,
  };

  const body = rest.body;
  if (body != null && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    rest.body = JSON.stringify(body);
  }

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...rest, headers });

  if (!skipAuthRedirect && res.status === 401) {
    clearStoredAuth();
    window.location.assign(`${window.location.origin}/login`);
    throw new Error('Session expired or invalid');
  }

  if (!skipAuthRedirect && res.status === 403) {
    const storedUser = getStoredUser();
    const role = storedUser?.role;
    const target = isValidRole(role) ? dashboardPathForRole(role) : '/login';
    window.location.assign(`${window.location.origin}${target}`);
    throw new Error('Insufficient permissions');
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export { baseUrl };
