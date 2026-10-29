import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export function useTransactions(filters) {
  const [data, setData] = useState({ results: [], count: 0 });
  const [loadedKey, setLoadedKey] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const {
    page,
    startDate,
    endDate,
    search,
    type,
    category,
    minAmount,
    maxAmount,
    ordering,
  } = filters;
  const params = useMemo(() => ({
    page,
    start_date: startDate,
    end_date: endDate,
    search,
    type,
    category,
    min_amount: minAmount,
    max_amount: maxAmount,
    ordering,
  }), [page, startDate, endDate, search, type, category, minAmount, maxAmount, ordering]);

  useEffect(() => {
    let cancelled = false;
    api
      .listTransactions(params)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setLoadedKey(params);
          setErrorState(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadedKey(params);
          setErrorState({ key: params, message: err.message });
        }
      })
    return () => {
      cancelled = true;
    };
  }, [params]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await api.listTransactions(params));
      setLoadedKey(params);
      setErrorState(null);
    } catch (err) {
      setErrorState({ key: params, message: err.message });
    } finally {
      setRefreshing(false);
    }
  }, [params]);

  const addTransaction = async (transaction) => {
    const created = await api.createTransaction(transaction);
    await refresh();
    return created;
  };

  const deleteTransaction = async (id) => {
    await api.deleteTransaction(id);
    await refresh();
  };

  return {
    transactions: data.results,
    count: data.count,
    loading: refreshing || (loadedKey !== params && errorState?.key !== params),
    error: errorState?.key === params ? errorState.message : null,
    page,
    addTransaction,
    deleteTransaction,
    refresh,
  };
}
