import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getToken, setToken, UNAUTHORIZED_EVENT } from "../lib/authToken";
import { authApi, type AuthSession } from "./api";

interface AuthState {
  session: AuthSession | null;
  /** True until the stored token (if any) has been checked against the backend. */
  loading: boolean;
  login: (operatorId: string, pin: string, role: string, tailId: string | null) => Promise<void>;
  logout: () => Promise<void>;
  setTail: (tailId: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(() => getToken() !== null);

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then(setSession)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setSession(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (operatorId: string, pin: string, role: string, tailId: string | null) => {
    const { token, ...s } = await authApi.login({ operator_id: operatorId, pin, role, tail_id: tailId });
    setToken(token);
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setToken(null);
      setSession(null);
    }
  }, []);

  const setTail = useCallback(async (tailId: string) => {
    setSession(await authApi.setTail(tailId));
  }, []);

  return <AuthContext.Provider value={{ session, loading, login, logout, setTail }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
