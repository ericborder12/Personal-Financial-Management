import { useEffect, useState } from "react";
import { api } from "../api/client";
import { AuthContext } from "./context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await api.csrf();
        const me = await api.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();

    const onUnauthorized = () => setUser(null);
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener("auth:unauthorized", onUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    const me = await api.login({ email, password });
    setUser(me);
    return me;
  };

  const register = async (email, password, display_name) => {
    const me = await api.register({ email, password, display_name });
    setUser(me);
    return me;
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading: user === undefined, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
