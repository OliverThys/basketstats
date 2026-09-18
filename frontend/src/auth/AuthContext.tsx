import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { fetchCurrentUser, login as apiLogin, logout as apiLogout, registerOrganization } from "../api/auth";
import type { CurrentUser } from "../api/auth";
import { ApiError, getStoredUser, getToken, setStoredUser } from "../api/http";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string) => Promise<void>;
  register: (orgName: string, email: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously from the last known /auth/me result so a reload
  // while offline still renders the app instead of bouncing to the login
  // screen (live entry must work with zero network, see the project brief).
  const [user, setUser] = useState<CurrentUser | null>(() =>
    getToken() ? getStoredUser<CurrentUser>() : null,
  );
  const [loading, setLoading] = useState(() => Boolean(getToken()) && !getStoredUser<CurrentUser>());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const currentUser = await fetchCurrentUser();
      setStoredUser(currentUser);
      setUser(currentUser);
    } catch (err) {
      // Only a real auth rejection (expired/invalid token) should log the
      // user out. A network failure (offline) must not: keep whatever user
      // we already have cached and let the offline sync layer catch up later.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        apiLogout();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string) => {
      setError(null);
      try {
        await apiLogin(email);
        await refresh();
      } catch {
        setError("Aucun compte trouvé pour cet e-mail.");
        throw new Error("login failed");
      }
    },
    [refresh],
  );

  const register = useCallback(
    async (orgName: string, email: string, displayName: string) => {
      setError(null);
      try {
        await registerOrganization(orgName, email, displayName);
        await refresh();
      } catch {
        setError("Impossible de créer le club (e-mail déjà utilisé ?).");
        throw new Error("register failed");
      }
    },
    [refresh],
  );

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, login, register, logout }),
    [user, loading, error, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
