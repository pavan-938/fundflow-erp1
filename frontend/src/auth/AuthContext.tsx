import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { clearStoredToken, getStoredToken, setStoredToken, setUnauthorizedHandler } from '../services/api';
import { fetchMe, login as loginRequest } from '../services/authApi';
import type { User } from '../types';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const existing = getStoredToken();
      if (!existing) {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
        return;
      }

      try {
        const response = await fetchMe(existing);
        if (!cancelled) {
          setToken(existing);
          setUser(response.user);
        }
      } catch {
        if (!cancelled) {
          clearStoredToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    setStoredToken(response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isBootstrapping,
      login,
      logout,
    }),
    [user, token, isBootstrapping, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
