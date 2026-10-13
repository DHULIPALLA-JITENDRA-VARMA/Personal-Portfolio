import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '../api';

type AuthState = { status: 'checking' } | { status: 'anonymous' } | { status: 'authenticated'; username: string };

interface AuthContextValue {
  state: AuthState;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The session lives in an httpOnly cookie that JavaScript cannot read, so the only way to know
// whether we are signed in is to ask the server (`GET /api/admin/me`).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'checking' });

  useEffect(() => {
    api
      .me()
      .then((s) => setState({ status: 'authenticated', username: s.username }))
      .catch(() => setState({ status: 'anonymous' }));
    const onUnauthorized = () => setState({ status: 'anonymous' });
    window.addEventListener(api.UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(api.UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const session = await api.login(username, password);
    setState({ status: 'authenticated', username: session.username });
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setState({ status: 'anonymous' });
  }, []);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
