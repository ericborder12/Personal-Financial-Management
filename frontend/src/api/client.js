const BASE = "/api";

export class ApiError extends Error {
  constructor(status, data) {
    const message =
      data && typeof data.detail === "string"
        ? data.detail
        : "Không kết nối được máy chủ, vui lòng thử lại.";
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getCookie(name) {
  const prefix = `${name}=`;
  const item = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

async function fetchCsrf() {
  const res = await fetch(`${BASE}/auth/csrf/`, { credentials: "include" });
  if (!res.ok) {
    throw new ApiError(res.status, null);
  }
}

async function request(path, { method = "GET", body, retryCsrf = true } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (unsafe && !getCookie("csrftoken")) {
    await fetchCsrf();
  }
  const token = getCookie("csrftoken");
  if (unsafe && token) {
    headers["X-CSRFToken"] = token;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // The CSRF cookie may have rotated (for example after login). Refresh and
  // retry once; a CSRF rejection happens before the view runs, so it is safe.
  if (unsafe && res.status === 403 && retryCsrf) {
    await fetchCsrf();
    return request(path, { method, body, retryCsrf: false });
  }

  if (res.status === 204) {
    return null;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    throw new ApiError(res.status, data);
  }

  return data;
}

export const api = {
  csrf: () => fetchCsrf(),
  me: () => request("/auth/me/"),
  register: (data) => request("/auth/register/", { method: "POST", body: data }),
  login: (data) => request("/auth/login/", { method: "POST", body: data }),
  logout: () => request("/auth/logout/", { method: "POST" }),
  verifyEmail: (data) => request("/auth/verify-email/", { method: "POST", body: data }),
  resendVerificationEmail: (data) =>
    request("/auth/verification-email/", { method: "POST", body: data }),
  requestPasswordReset: (data) =>
    request("/auth/password-reset/", { method: "POST", body: data }),
  confirmPasswordReset: (data) =>
    request("/auth/password-reset/confirm/", { method: "POST", body: data }),

  listTransactions: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.set(key, value);
      }
    });
    const suffix = query.toString();
    return request(`/transactions/${suffix ? `?${suffix}` : ""}`);
  },
  transactionSummary: (month) =>
    request(`/transactions/summary/?${new URLSearchParams({ month })}`),
  createTransaction: (data) => request("/transactions/", { method: "POST", body: data }),
  deleteTransaction: (id) => request(`/transactions/${id}/`, { method: "DELETE" }),

  getBudgets: () => request("/budgets/"),
  saveBudgets: (budgets) => request("/budgets/", { method: "PUT", body: budgets }),

  getProfile: () => request("/profile/"),
  updateProfile: (data) => request("/profile/", { method: "PUT", body: data }),

  importData: (data) => request("/import/", { method: "POST", body: data }),
};
