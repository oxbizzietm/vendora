import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import AuthContext from "./authContext";

const TOKEN_KEY = "vendora_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/profile");

        if (active) {
          setUser(data.user);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);

        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [token]);

  const completeAuth = useCallback(function completeAuth(nextToken, nextUser) {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(async function login(credentials) {
    const { data } = await api.post("/auth/login", credentials);
    completeAuth(data.token, data.user);
    return data.user;
  }, [completeAuth]);

  const register = useCallback(async function register(account) {
    const { data } = await api.post("/auth/register", account);
    completeAuth(data.token, data.user);
    return data.user;
  }, [completeAuth]);

  const logout = useCallback(function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      logout,
      register,
      token,
      user,
    }),
    [loading, login, logout, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
