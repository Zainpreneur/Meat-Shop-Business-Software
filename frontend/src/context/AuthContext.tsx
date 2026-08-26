import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/endpoints";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("meatshop_token");
    const cachedUser = localStorage.getItem("meatshop_user");
    if (token && cachedUser) {
      setUser(JSON.parse(cachedUser));
      // Revalidate in background; if the token is stale the client's 401
      // interceptor will clear storage and redirect to /login.
      authApi
        .me()
        .then((freshUser) => {
          setUser(freshUser);
          localStorage.setItem("meatshop_user", JSON.stringify(freshUser));
        })
        .catch(() => {
          /* handled by axios interceptor */
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const { token, user: loggedInUser } = await authApi.login(email, password);
    localStorage.setItem("meatshop_token", token);
    localStorage.setItem("meatshop_user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  function logout() {
    localStorage.removeItem("meatshop_token");
    localStorage.removeItem("meatshop_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
