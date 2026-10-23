import { useLocalStorage } from "./useLocalStorage";

const DEFAULT_BUDGETS = {
  "Nhà ở": { limit: 2500000, fixed: true },
  "Ăn uống": { limit: 3000000, fixed: false },
  "Di chuyển": { limit: 1000000, fixed: false },
};

export function useBudgets() {
  const [budgets, setBudgets] = useLocalStorage("finance-app:budgets", DEFAULT_BUDGETS);
  return { budgets, setBudgets };
}