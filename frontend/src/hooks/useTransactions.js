import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listTransactions()
      .then((data) => {
        if (!cancelled) setTransactions(data);
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
      setTransactions(await api.listTransactions());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = async (data) => {
    const created = await api.createTransaction(data);
    setTransactions((prev) => [created, ...prev]);
    return created;
  };

  const deleteTransaction = async (id) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    transactions,
    loading,
    error,
    addTransaction,
    deleteTransaction,
    refresh,
  };
}
