export const LEGACY_KEYS = {
  transactions: "finance-app:transactions",
  budgets: "finance-app:budgets",
  initialBalance: "finance-app:initial-balance",
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function normalizeBudgets(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        category: item.category,
        limit: Number(item.limit) || 0,
        fixed: Boolean(item.fixed),
      }));
  }

  if (!value || typeof value !== "object") return [];

  return Object.entries(value)
    .filter(([, item]) => item && typeof item === "object")
    .map(([category, item]) => ({
      category,
      limit: Number(item.limit) || 0,
      fixed: Boolean(item.fixed),
    }));
}

export function readLegacy() {
  const transactions = readJson(LEGACY_KEYS.transactions, []);
  const budgets = normalizeBudgets(readJson(LEGACY_KEYS.budgets, {}));
  const balance = Number(readJson(LEGACY_KEYS.initialBalance, 0));

  return {
    transactions: Array.isArray(transactions) ? transactions : [],
    budgets,
    initialBalance: Number.isFinite(balance) ? balance : 0,
  };
}

export function hasLegacyData(legacy) {
  return (
    legacy.transactions.length > 0 ||
    legacy.budgets.some((budget) => budget.limit > 0) ||
    legacy.initialBalance > 0
  );
}

export function clearLegacy() {
  for (const key of Object.values(LEGACY_KEYS)) {
    localStorage.removeItem(key);
  }
}
