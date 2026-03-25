import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { dashboardPathForRole } from '../lib/roles';
import { clearStoredAuth, getStoredToken, getStoredUser, setStoredAuth } from '../lib/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [ready, setReady] = useState(() => !getStoredToken());

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
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
