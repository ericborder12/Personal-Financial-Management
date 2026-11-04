import { useState, useEffect, useCallback } from "react";
import { financeApi } from "../api/finance";

export function useFinanceDashboard(year, month) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getDashboard(year, month);
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refresh: fetchDashboard };
}

export function useAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getAccounts();
      setAccounts(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const createAccount = async (data) => {
    const res = await financeApi.createAccount(data);
    await fetchAccounts();
    return res;
  };

  const updateAccount = async (id, data) => {
    const res = await financeApi.updateAccount(id, data);
    await fetchAccounts();
    return res;
  };

  const deleteAccount = async (id) => {
    await financeApi.deleteAccount(id);
    await fetchAccounts();
  };

  return {
    accounts,
    loading,
    error,
    refresh: fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}

export function useCategories(type) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getCategories(type);
      setCategories(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (data) => {
    const res = await financeApi.createCategory(data);
    await fetchCategories();
    return res;
  };

  const updateCategory = async (id, data) => {
    const res = await financeApi.updateCategory(id, data);
    await fetchCategories();
    return res;
  };

  const deleteCategory = async (id) => {
    await financeApi.deleteCategory(id);
    await fetchCategories();
  };

  return {
    categories,
    loading,
    error,
    refresh: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

export function useTransactions(initialParams = {}) {
  const [transactions, setTransactions] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetchTransactions = useCallback(async (currentParams = params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getTransactions(currentParams);
      // Handles both paginated ({ results: [], count: n }) and unpaginated array
      if (res && res.results) {
        setTransactions(res.results);
        setCount(res.count);
      } else if (Array.isArray(res)) {
        setTransactions(res);
        setCount(res.length);
      } else {
        setTransactions([]);
        setCount(0);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchTransactions(params);
  }, [fetchTransactions, params]);

  const createTransaction = async (data) => {
    const res = await financeApi.createTransaction(data);
    await fetchTransactions(params);
    return res;
  };

  const deleteTransaction = async (id) => {
    await financeApi.deleteTransaction(id);
    await fetchTransactions(params);
  };

  return {
    transactions,
    count,
    loading,
    error,
    params,
    setParams,
    refresh: () => fetchTransactions(params),
    createTransaction,
    deleteTransaction,
  };
}

export function useBudgets(year, month) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getBudgets(year, month);
      setBudgets(res || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const setBudget = async (data) => {
    const res = await financeApi.setBudget(data);
    await fetchBudgets();
    return res;
  };

  const deleteBudget = async (id) => {
    await financeApi.deleteBudget(id);
    await fetchBudgets();
  };

  return {
    budgets,
    loading,
    error,
    refresh: fetchBudgets,
    setBudget,
    deleteBudget,
  };
}
