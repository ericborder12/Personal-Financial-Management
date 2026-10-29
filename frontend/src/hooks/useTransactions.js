import { useState, useEffect } from "react";

const STORAGE_KEY = "finance-app:transactions";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

import { useLocalStorage } from "./useLocalStorage";

export function useTransactions() {
  const [transactions, setTransactions] = useLocalStorage("finance-app:transactions", []);

  const addTransaction = (data) => {
    setTransactions((prev) => [{ id: crypto.randomUUID(), ...data }, ...prev]);
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return { transactions, addTransaction, deleteTransaction };
}