import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { dashboardPathForRole, isValidRole } from '../lib/roles';
import { clearStoredAuth, getStoredToken, getStoredUser, setStoredAuth } from '../lib/authStorage';

const AuthContext = createContext(null);

function decodeJwtPayload(token) {
  // JWT is base64url-encoded: header.payload.signature
  // We only need payload.role for RBAC correctness.
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

// If there is a token but role is missing/invalid (e.g. user registered without a Student row),
// we clear auth so the UI does not redirect into a loop.
const tokenAtLoad = getStoredToken();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    if (!tokenAtLoad) return null;
    const storedUser = getStoredUser();
    const payload = decodeJwtPayload(tokenAtLoad);
    const roleFromToken = payload?.role ?? storedUser?.role;
    if (!isValidRole(roleFromToken)) {
      clearStoredAuth();
      return null;
    }
    return storedUser ? { ...storedUser, role: roleFromToken } : { role: roleFromToken };
  });
  const [ready, setReady] = useState(() => !tokenAtLoad);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return;
    }

    // Validate role from JWT payload first to avoid any stale localStorage causing redirects.
    const payload = decodeJwtPayload(token);
    const roleFromToken = payload?.role;
    if (!isValidRole(roleFromToken)) {
      clearStoredAuth();
      // Avoid sync state update warnings; do it async.
      setTimeout(() => {
        setUser(null);
        setReady(true);
      }, 0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await api('/api/v1/users/me', { method: 'GET', skipAuthRedirect: true });
        if (!cancelled) setReady(true);
      } catch (e) {
        if (e.status === 401 || e.message?.includes('401')) {
          clearStoredAuth();
          if (!cancelled) setUser(null);
        }
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email, password, redirectTo) => {
      const res = await api('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuthRedirect: true,
      });
      if (!res.success || !res.data?.token) {
        throw new Error(res.error || 'Login failed');
      }
      const { user: u, token } = res.data;
      setStoredAuth(token, u);
      setUser(u);
      const target = redirectTo || dashboardPathForRole(u.role);
      navigate(target, { replace: true });
    },
    [navigate]
  );

  const register = useCallback(
    async ({ email, password, fullName, phoneNumber, universityId }, redirectTo) => {
      const body = { email, password, fullName };
      if (phoneNumber) body.phoneNumber = phoneNumber;
      if (universityId != null && universityId !== '') {
        body.universityId = Number(universityId);
      }
      const res = await api('/api/v1/auth/register', {
        method: 'POST',
        body,
        skipAuthRedirect: true,
      });
      if (!res.success || !res.data?.token) {
        throw new Error(res.error || 'Registration failed');
      }
      const { user: u, token } = res.data;
      setStoredAuth(token, u);
      setUser(u);
      const target = redirectTo || dashboardPathForRole(u.role);
      navigate(target, { replace: true });
    },
    [navigate]
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user && getStoredToken()),
      login,
      register,
      logout,
      dashboardPathForRole,
    }),
    [user, ready, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
