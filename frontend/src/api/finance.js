import { request } from "./client";

export const financeApi = {
  // Dashboard & Analytics
  getDashboard: (year, month) => {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (month) params.set("month", month);
    const qs = params.toString();
    return request(`/finance/dashboard/${qs ? `?${qs}` : ""}`);
  },

  getReports: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const qs = params.toString();
    return request(`/finance/reports/${qs ? `?${qs}` : ""}`);
  },

  // Accounts
  getAccounts: () => request("/finance/accounts/"),
  createAccount: (data) => request("/finance/accounts/", { method: "POST", body: data }),
  updateAccount: (id, data) => request(`/finance/accounts/${id}/`, { method: "PUT", body: data }),
  deleteAccount: (id) => request(`/finance/accounts/${id}/`, { method: "DELETE" }),

  // Categories
  getCategories: (type) => {
    const qs = type ? `?type=${type}` : "";
    return request(`/finance/categories/${qs}`);
  },
  createCategory: (data) => request("/finance/categories/", { method: "POST", body: data }),
  updateCategory: (id, data) => request(`/finance/categories/${id}/`, { method: "PUT", body: data }),
  deleteCategory: (id) => request(`/finance/categories/${id}/`, { method: "DELETE" }),

  // Transactions
  getTransactions: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.set(key, value);
      }
    });
    const qs = query.toString();
    return request(`/finance/transactions/${qs ? `?${qs}` : ""}`);
  },
  createTransaction: (data) => request("/finance/transactions/", { method: "POST", body: data }),
  updateTransaction: (id, data) => request(`/finance/transactions/${id}/`, { method: "PUT", body: data }),
  deleteTransaction: (id) => request(`/finance/transactions/${id}/`, { method: "DELETE" }),

  // Budgets
  getBudgets: (year, month) => {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (month) params.set("month", month);
    const qs = params.toString();
    return request(`/finance/budgets/${qs ? `?${qs}` : ""}`);
  },
  setBudget: (data) => request("/finance/budgets/", { method: "POST", body: data }),
  deleteBudget: (id) => request(`/finance/budgets/${id}/`, { method: "DELETE" }),

  // Savings Deposits
  getSavings: () => request("/finance/savings/"),
  createSaving: (data) => request("/finance/savings/", { method: "POST", body: data }),
  updateSaving: (id, data) => request(`/finance/savings/${id}/`, { method: "PATCH", body: data }),
  settleSaving: (id, data) => request(`/finance/savings/${id}/settle/`, { method: "POST", body: data }),
  deleteSaving: (id) => request(`/finance/savings/${id}/`, { method: "DELETE" }),

  // Support & Feedback
  getSupportPresence: () => request("/finance/support/presence/"),
  sendSupportHeartbeat: () => request("/finance/support/presence/", { method: "POST" }),
  getChatMessages: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.set(key, value);
      }
    });
    const qs = query.toString();
    return request(`/finance/support/messages/${qs ? `?${qs}` : ""}`);
  },
  sendChatMessage: (data) => request("/finance/support/messages/", { method: "POST", body: data }),
  getFeedbacks: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.set(key, value);
      }
    });
    const qs = query.toString();
    return request(`/finance/support/feedback/${qs ? `?${qs}` : ""}`);
  },
  createFeedback: (data) => request("/finance/support/feedback/", { method: "POST", body: data }),
  updateFeedback: (id, data) => request(`/finance/support/feedback/${id}/`, { method: "PATCH", body: data }),
};
