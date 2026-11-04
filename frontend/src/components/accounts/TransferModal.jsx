import React, { useState, useEffect } from "react";
import { IconX, IconTransfer } from "../common/Icons";
import { formatVND } from "../../constants";

export default function TransferModal({
  isOpen,
  onClose,
  accounts = [],
  onTransferSuccess,
  defaultSourceAccount = null,
}) {
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (defaultSourceAccount) {
      setFromAccount(defaultSourceAccount.id);
    } else if (accounts.length > 0 && !fromAccount) {
      setFromAccount(accounts[0].id);
    }
  }, [defaultSourceAccount, accounts, isOpen, fromAccount]);

  useEffect(() => {
    // Pick another account for toAccount if not set or equal
    if (accounts.length > 1) {
      const candidates = accounts.filter((a) => a.id !== fromAccount);
      if (candidates.length > 0 && (!toAccount || toAccount === fromAccount)) {
        setToAccount(candidates[0].id);
      }
    }
  }, [fromAccount, accounts, toAccount]);

  if (!isOpen) return null;

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

  const selectedFrom = accounts.find((a) => a.id === fromAccount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40">
              <IconTransfer className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white my-0">
              Chuyển tiền nội bộ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Từ tài khoản
              </label>
              <select
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatVND(acc.current_balance)})
                  </option>
                ))}
              </select>
              {selectedFrom && (
                <span className="mt-1 block text-[10px] text-slate-400">
                  Khả dụng: {formatVND(selectedFrom.current_balance)}
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Đến tài khoản
              </label>
              <select
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
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
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base font-bold text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Ngày chuyển
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Ghi chú
              </label>
              <input
                type="text"
                placeholder="Rút tiền ATM, nạp ví..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? "Đang chuyển..." : "Xác nhận chuyển"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
