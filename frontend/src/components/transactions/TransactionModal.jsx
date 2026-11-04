import React, { useState, useEffect } from "react";
import { IconX } from "../common/Icons";

export default function TransactionModal({
  isOpen,
  onClose,
  onSave,
  accounts = [],
  categories = [],
  initialType = "expense",
}) {
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setType(initialType);
    setAmount("");
    setNote("");
    setDate(new Date().toLocaleDateString("sv-SE"));
    setError(null);

    if (accounts.length > 0) {
      setAccount(accounts[0].id);
      if (accounts.length > 1) {
        setToAccount(accounts[1].id);
      }
    }
  }, [isOpen, initialType, accounts]);

  // When type changes, preselect appropriate first category
  const filteredCategories = categories.filter((c) => c.type === type);
  useEffect(() => {
    const matching = categories.filter((c) => c.type === type);
    if (type !== "transfer" && matching.length > 0) {
      setCategory(matching[0].id);
    } else {
      setCategory("");
    }
  }, [type, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10) || 0;
    if (numAmount <= 0) {
      setError("Số tiền phải lớn hơn 0");
      return;
    }
    if (!account) {
      setError("Vui lòng chọn tài khoản");
      return;
    }

    const payload = {
      type,
      amount: numAmount,
      account,
      date,
      note: note.trim(),
    };

    if (type === "transfer") {
      if (!toAccount) {
        setError("Vui lòng chọn tài khoản nhận");
        return;
      }
      if (account === toAccount) {
        setError("Tài khoản nhận phải khác tài khoản chuyển");
        return;
      }
      payload.to_account = toAccount;
    } else {
      if (!category) {
        setError("Vui lòng chọn danh mục");
        return;
      }
      payload.category = category;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Không thể tạo giao dịch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white my-0">
            Thêm giao dịch mới
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`rounded-lg py-2 transition-all ${
              type === "expense"
                ? "bg-white text-rose-600 shadow-xs dark:bg-slate-900 dark:text-rose-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`rounded-lg py-2 transition-all ${
              type === "income"
                ? "bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Thu nhập
          </button>
          <button
            type="button"
            onClick={() => setType("transfer")}
            className={`rounded-lg py-2 transition-all ${
              type === "transfer"
                ? "bg-white text-purple-600 shadow-xs dark:bg-slate-900 dark:text-purple-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Chuyển tiền
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Amount input */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Số tiền (VNĐ)
            </label>
            <input
              type="text"
              required
              placeholder="0"
              value={Number(amount || 0).toLocaleString("vi-VN")}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setAmount(raw);
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-lg font-extrabold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Conditional Fields: Income/Expense vs Transfer */}
          {type === "transfer" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Từ tài khoản
                </label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Đến tài khoản
                </label>
                <select
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {accounts
                    .filter((a) => a.id !== account)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Tài khoản
                </label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Danh mục
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Date and Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Ngày giao dịch
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Ghi chú
              </label>
              <input
                type="text"
                placeholder="VD: Cà phê, Lương tháng 11..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Đang lưu..." : "Tạo giao dịch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
