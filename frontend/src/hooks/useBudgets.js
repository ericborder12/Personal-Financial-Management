import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

function toObject(list) {
  return Object.fromEntries(
    list.map((budget) => [
      budget.category,
      { limit: budget.limit, fixed: budget.fixed },
    ])
  );
}

export function useBudgets() {
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getBudgets()
      .then((list) => {
        if (!cancelled) setBudgets(toObject(list));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBudgets(toObject(await api.getBudgets()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveBudgets = async (next) => {
    const payload = Object.entries(next).map(([category, budget]) => ({
      category,
      limit: budget.limit,
      fixed: budget.fixed,
    }));
    const saved = toObject(await api.saveBudgets(payload));
    setBudgets(saved);
    return saved;
  };

  return { budgets, loading, error, saveBudgets, refresh };
}
