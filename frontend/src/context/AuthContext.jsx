import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { dashboardPathForRole, isValidRole } from '../lib/roles';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
} from '../lib/authStorage';
import { decodeJwtPayload } from '../lib/jwtPayload';

const AuthContext = createContext(null);

function numUserId(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
    const idFromJwt = numUserId(payload?.userId ?? payload?.UserID);
    const idFromStored = numUserId(storedUser?.id ?? storedUser?.UserID);
    // JWT is authoritative — stale localStorage id must not override (e.g. after switching accounts).
    const resolvedId = idFromJwt ?? idFromStored;
    if (storedUser) {
      return {
        ...storedUser,
        role: roleFromToken,
        ...(resolvedId != null ? { id: resolvedId } : {}),
      };
    }
    return {
      role: roleFromToken,
      ...(resolvedId != null ? { id: resolvedId } : {}),
      ...(payload?.email ? { email: payload.email } : {}),
    };
  });
  const [ready, setReady] = useState(() => !tokenAtLoad);

  /** Apply JWT + /me so UI matches the token (critical when another tab logs in — shared localStorage). */
  const syncSessionWithServer = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }

    const payload = decodeJwtPayload(token);
    const roleFromToken = payload?.role;
    if (!isValidRole(roleFromToken)) {
      clearStoredAuth();
      setUser(null);
      setReady(true);
      return;
    }

    const idFromJwt = numUserId(payload?.userId ?? payload?.UserID);
    const storedUser = getStoredUser();
    setUser((prev) => ({
      ...(storedUser || {}),
      ...prev,
      role: roleFromToken,
      ...(idFromJwt != null ? { id: idFromJwt } : {}),
      email: payload?.email ?? storedUser?.email ?? prev?.email,
    }));

    try {
      const meRes = await api('/api/v1/users/me', { method: 'GET', skipAuthRedirect: true });
      if (meRes?.success && meRes.data) {
        const d = meRes.data;
        const serverId = numUserId(d.id);
        setUser((prev) => ({
          ...prev,
          id: serverId ?? numUserId(prev?.id),
          email: d.email ?? prev?.email,
          fullName: d.name ?? prev?.fullName,
          role: roleFromToken,
        }));
        const t = getStoredToken();
        if (t) {
          const u = getStoredUser() || {};
          setStoredAuth(t, {
            ...u,
            id: serverId ?? numUserId(u.id),
            email: d.email ?? u.email,
            fullName: d.name ?? u.fullName,
            role: roleFromToken,
          });
        }
      }
    } catch (e) {
      if (e.status === 401 || e.message?.includes('401')) {
        clearStoredAuth();
        setUser(null);
      }
    } finally {
      setReady(true);
    }
  }, []);

  const syncSessionWithServerRef = useRef(syncSessionWithServer);
  syncSessionWithServerRef.current = syncSessionWithServer;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncSessionWithServer();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [syncSessionWithServer]);

  // Other windows/tabs share localStorage: logging in there overwrites the token here.
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== AUTH_TOKEN_KEY && e.key !== AUTH_USER_KEY) return;
      void syncSessionWithServerRef.current();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
