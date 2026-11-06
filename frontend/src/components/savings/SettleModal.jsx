import React, { useState, useEffect } from "react";
import { IconX } from "../common/Icons";
import { formatVND, formatDate } from "../../constants";

export default function SettleModal({
  isOpen,
  onClose,
  onSettle,
  deposit,
  accounts = [],
}) {
  const [destinationAccount, setDestinationAccount] = useState("");
  const [actualInterest, setActualInterest] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && deposit) {
      setError(null);
      // Pre-select destination account
      const eligible = accounts.filter((a) => a.type !== "savings");
      if (deposit.source_account && eligible.some((a) => a.id === deposit.source_account)) {
        setDestinationAccount(deposit.source_account);
      } else if (eligible.length > 0) {
        setDestinationAccount(eligible[0].id);
      } else {
        setDestinationAccount("");
      }

      // Check if settled early
      const today = new Date().toISOString().slice(0, 10);
      const isEarly = deposit.maturity_date && today < deposit.maturity_date;
      // If early, suggest 0 or user can enter demand deposit interest; otherwise prefill estimated
      setActualInterest(isEarly ? "0" : String(deposit.estimated_interest || 0));
    }
  }, [isOpen, deposit, accounts]);

  if (!isOpen || !deposit) return null;

  const today = new Date().toISOString().slice(0, 10);
  const isEarly = deposit.maturity_date && today < deposit.maturity_date;
  const numActualInterest = Math.max(0, Number(actualInterest) || 0);
  const totalPayout = (Number(deposit.amount) || 0) + numActualInterest;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destinationAccount) {
      setError("Vui lòng chọn tài khoản nhận tiền hoàn gốc và lãi.");
      return;
    }

    setSubmitting(true);
    try {
      await onSettle(deposit.id, {
        destination_account: destinationAccount,
        actual_interest: numActualInterest,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Không thể tất toán sổ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Tất toán sổ tiết kiệm
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hoàn gốc về ví và ghi nhận tiền lãi thực tế
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Deposit details summary card */}
        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {deposit.bank_name}
            </span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
              {formatVND(deposit.amount)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-500 dark:text-slate-400 pt-1">
            <div>Kỳ hạn: <b className="text-slate-700 dark:text-slate-300">{deposit.term_months} tháng</b></div>
            <div>Lãi suất: <b className="text-slate-700 dark:text-slate-300">{deposit.interest_rate}%/năm</b></div>
            <div>Ngày gửi: <b className="text-slate-700 dark:text-slate-300">{formatDate(deposit.start_date)}</b></div>
            <div>Ngày đáo hạn: <b className="text-slate-700 dark:text-slate-300">{formatDate(deposit.maturity_date)}</b></div>
          </div>

          {isEarly ? (
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-medium">
              ⚠️ Sổ đang được tất toán <b>trước ngày đáo hạn</b>. Các ngân hàng thường chỉ áp dụng lãi suất không kỳ hạn (~0.1% - 0.5%).
            </div>
          ) : (
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium">
              ✓ Sổ đã đến hạn thanh toán đủ lãi suất kỳ hạn!
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Destination Account */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Tài khoản nhận tiền gốc & lãi
            </label>
            <select
              value={destinationAccount}
              onChange={(e) => setDestinationAccount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            >
              {accounts
                .filter((a) => a.type !== "savings")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatVND(a.current_balance)})
                  </option>
                ))}
            </select>
          </div>

          {/* Actual Interest Received */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Số tiền lãi thực nhận (VND)
              </label>
              <span className="text-xs text-slate-400">
                (Dự tính: {formatVND(deposit.estimated_interest)})
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="1000"
              value={actualInterest}
              onChange={(e) => setActualInterest(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              * Khoản tiền lãi này sẽ được ghi nhận vào mục Thu nhập ("Lãi tiết kiệm").
            </p>
          </div>

          {/* Payout preview box */}
          <div className="rounded-xl bg-blue-50/70 p-3 text-xs dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex justify-between items-center font-bold">
            <span className="text-slate-700 dark:text-slate-300">Tổng tiền nhận về tài khoản:</span>
            <span className="text-base text-blue-600 dark:text-blue-400">{formatVND(totalPayout)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "Đang tất toán..." : "Xác nhận tất toán"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
