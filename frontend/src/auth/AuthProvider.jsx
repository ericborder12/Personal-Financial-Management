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

  const login = async (email, password, remember_me = false) => {
    const me = await api.login({ email, password, remember_me });
    setUser(me);
    return me;
  };

  const register = async (email, password, display_name) => {
    return api.register({ email, password, display_name });
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (data) => {
    const updated = await api.updateMe(data);
    setUser((prev) => ({ ...prev, ...updated }));
    return updated;
  };

  const refreshUser = async () => {
    const me = await api.me();
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: user === undefined,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
