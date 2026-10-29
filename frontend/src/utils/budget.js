// Tổng chi theo từng danh mục trong tháng "YYYY-MM"
export function getSpentByCategory(transactions, month) {
  const result = {};
  for (const t of transactions) {
    if (t.type === "expense" && t.date.startsWith(month)) {
      result[t.category] = (result[t.category] || 0) + t.amount;
    }
  }
  return result;
}

// Tiền có để phân bổ trong tháng = số dư đầu tháng + thu nhập trong tháng
export function getMonthPool(transactions, initialBalance, month) {
  const start = `${month}-01`;
  const end = `${month}-31`;
  let pool = initialBalance;
  for (const t of transactions) {
    if (t.type === "income" && t.date <= end) pool += t.amount;
    if (t.type === "expense" && t.date < start) pool -= t.amount;
  }
  return pool;
}

export const getStatus = (spent, limit) =>
  spent > limit ? "over" : spent >= limit * 0.8 ? "near" : "ok";