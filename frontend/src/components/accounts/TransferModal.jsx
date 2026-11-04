import React, { useState } from "react";
import { IconX, IconTransfer } from "../common/Icons";
import { formatVND } from "../../constants";

export default function TransferModal({
  isOpen,
  onClose,
  accounts = [],
  onTransferSuccess,
  defaultSourceAccount = null,
}) {
  const initialFrom = defaultSourceAccount?.id || (accounts[0]?.id ?? "");
  const otherAccounts = accounts.filter((a) => a.id !== initialFrom);
  const initialTo = otherAccounts[0]?.id || "";

  const [fromAccount, setFromAccount] = useState(initialFrom);
  const [toAccount, setToAccount] = useState(initialTo);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const selectedFrom = accounts.find((a) => a.id === fromAccount);

  const handleQuickAmount = (val) => {
    if (val === "all" && selectedFrom) {
      setAmount(String(Math.max(0, selectedFrom.current_balance)));
    } else {
      setAmount(String(val));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromAccount) {
      setError("Vui lòng chọn tài khoản nguồn");
      return;
    }
    if (!toAccount) {
      setError("Vui lòng chọn tài khoản đích");
      return;
    }
    if (fromAccount === toAccount) {
      setError("Tài khoản nhận phải khác tài khoản chuyển");
      return;
    }
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10) || 0;
    if (numAmount <= 0) {
      setError("Số tiền chuyển phải lớn hơn 0");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onTransferSuccess({
        type: "transfer",
        account: fromAccount,
        to_account: toAccount,
        amount: numAmount,
        date,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Chuyển tiền thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50">
              <IconTransfer className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white my-0">
              Chuyển tiền nội bộ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Từ tài khoản
              </label>
              <select
                value={fromAccount}
                onChange={(e) => {
                  const newFrom = e.target.value;
                  setFromAccount(newFrom);
                  if (newFrom === toAccount) {
                    const candidate = accounts.find((a) => a.id !== newFrom);
                    if (candidate) setToAccount(candidate.id);
                  }
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatVND(acc.current_balance)})
                  </option>
                ))}
              </select>
              {selectedFrom && (
                <span className="mt-1 block text-[10px] text-slate-400 tabular-nums">
                  Khả dụng: {formatVND(selectedFrom.current_balance)}
                </span>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Đến tài khoản
              </label>
              <select
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {accounts
                  .filter((a) => a.id !== fromAccount)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatVND(acc.current_balance)})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Số tiền chuyển (VNĐ)
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
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-lg font-extrabold text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white tabular-nums"
            />
            {/* Quick amount chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[200000, 500000, 1000000, 2000000, 5000000].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => handleQuickAmount(v)}
                  className="cursor-pointer rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-purple-50 hover:text-purple-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-950/40 dark:hover:text-purple-300 transition-colors"
                >
                  +{formatVND(v)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleQuickAmount("all")}
                className="cursor-pointer rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 transition-colors"
              >
                Tất cả số dư
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Ngày chuyển
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Ghi chú
              </label>
              <input
                type="text"
                placeholder="Rút tiền ATM, nạp ví..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {submitting ? "Đang xử lý..." : "Xác nhận chuyển tiền"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
