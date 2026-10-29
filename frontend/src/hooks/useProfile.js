import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";

const SAVE_DELAY = 500;

export function useProfile() {
  const [initialBalance, setInitialBalanceState] = useState(0);
  const [importedAt, setImportedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getProfile()
      .then((profile) => {
        if (!cancelled) {
          setInitialBalanceState(profile.initial_balance);
          setImportedAt(profile.imported_at);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await api.getProfile();
      setInitialBalanceState(profile.initial_balance);
      setImportedAt(profile.imported_at);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const setInitialBalance = (value) => {
    setInitialBalanceState(value);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const profile = await api.updateProfile({ initial_balance: value });
        setImportedAt(profile.imported_at);
      } catch (err) {
        setError(err.message);
      }
    }, SAVE_DELAY);
  };

  return {
    initialBalance,
    importedAt,
    loading,
    error,
    setInitialBalance,
    refresh,
  };
}
