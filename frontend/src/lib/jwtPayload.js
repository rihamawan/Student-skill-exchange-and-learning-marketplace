import { getStoredToken } from './authStorage';

/**
 * Decode JWT payload (no verification — server verifies on API calls).
 * Backend signs: { userId, email, role }.
 */
export function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Numeric user id from the stored token (authoritative for who is logged in). */
export function getTokenUserId() {
  const payload = decodeJwtPayload(getStoredToken());
  if (!payload) return null;
  const n = Number(payload.userId ?? payload.UserID);
  return Number.isFinite(n) ? n : null;
}
