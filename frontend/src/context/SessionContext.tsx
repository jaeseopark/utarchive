import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { LoginResponseSchema, LogoutResponseSchema, SessionSchema } from '../api/schemas';

export interface SessionUser {
  id: string;
}

export interface LoginPayload {
  id: string;
  password: string;
  totpCode: string;
}

export interface SessionContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const data = await api.get('/auth/me', SessionSchema, { preventUnauthorizedRedirect: true });
        setUser({ id: data.id });
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (credentials: LoginPayload) => {
    const data = await api.post('/auth/login', credentials, LoginResponseSchema, {
      preventUnauthorizedRedirect: true,
    });
    setUser({ id: data.id });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', null, LogoutResponseSchema, {
        preventUnauthorizedRedirect: true,
      });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
