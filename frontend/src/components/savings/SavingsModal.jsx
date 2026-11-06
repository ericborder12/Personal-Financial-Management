import React, { useState, useEffect, useMemo } from "react";
import { IconX } from "../common/Icons";
import { formatVND } from "../../constants";

const POPULAR_BANKS = [
  "Vietcombank",
  "Techcombank",
  "MBBank",
  "BIDV",
  "VietinBank",
  "VPBank",
  "ACB",
  "TPBank",
  "Sacombank",
  "Khác",
];

export default function SavingsModal({
  isOpen,
  onClose,
  onSave,
  accounts = [],
}) {
  const [bankName, setBankName] = useState("Vietcombank");
  const [customBank, setCustomBank] = useState("");
  const [sourceAccount, setSourceAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [termMonths, setTermMonths] = useState(6);
  const [interestRate, setInterestRate] = useState("5.5");
  const [payoutType, setPayoutType] = useState("end_of_term");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setBankName("Vietcombank");
      setCustomBank("");
      setAmount("");
      setStartDate(new Date().toLocaleDateString("sv-SE"));
      setTermMonths(6);
      setInterestRate("5.5");
      setPayoutType("end_of_term");
      setNotes("");
      setError(null);

      // Filter out savings accounts for source selection
      const eligible = accounts.filter((a) => a.type !== "savings");
      if (eligible.length > 0) {
        setSourceAccount(eligible[0].id);
      } else {
        setSourceAccount("");
      }
    }
  }, [isOpen, accounts]);

  // Realtime calculation preview
  const preview = useMemo(() => {
    const numAmount = Number(amount) || 0;
    const numRate = (Number(interestRate) || 0) / 100;
    const numMonths = Number(termMonths) || 1;

    const interest = Math.round(numAmount * numRate * (numMonths / 12));

    let maturity = "";
    if (startDate) {
      const parts = startDate.split("-").map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1 + numMonths, parts[2]);
        maturity = d.toLocaleDateString("vi-VN");
      }
    }

    return {
      interest,
      total: numAmount + interest,
      maturity,
    };
  }, [amount, interestRate, termMonths, startDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const finalBank = bankName === "Khác" ? customBank.trim() : bankName;
    if (!finalBank) {
      setError("Vui lòng nhập tên ngân hàng.");
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Số tiền gửi phải lớn hơn 0.");
      return;
    }

    const numRate = Number(interestRate);
    if (isNaN(numRate) || numRate <= 0) {
      setError("Lãi suất phải lớn hơn 0%.");
      return;
    }

    // Check account balance if source account chosen
    const selectedAcc = accounts.find((a) => a.id === sourceAccount);
    if (selectedAcc && selectedAcc.current_balance < numAmount) {
      setError(`Số dư tài khoản (${formatVND(selectedAcc.current_balance)}) không đủ để gửi ${formatVND(numAmount)}.`);
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        bank_name: finalBank,
        source_account: sourceAccount || null,
        amount: numAmount,
        start_date: startDate,
        term_months: Number(termMonths),
        interest_rate: numRate,
        payout_type: payoutType,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Không thể lưu sổ tiết kiệm. Vui lòng thử lại.");
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

      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Mở sổ tiết kiệm mới
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ghi nhận khoản tiền gửi sinh lời có kỳ hạn
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Bank selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Ngân hàng
            </label>
            <div className="grid grid-cols-3 gap-2">
              {POPULAR_BANKS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBankName(b)}
                  className={`cursor-pointer rounded-xl p-2 text-xs font-semibold border transition-all text-center ${
                    bankName === b
                      ? "border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:border-blue-500 dark:text-blue-400"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            {bankName === "Khác" && (
              <input
                type="text"
                placeholder="Nhập tên ngân hàng..."
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            )}
          </div>

          {/* Source Account */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Trích từ tài khoản
            </label>
            <select
              value={sourceAccount}
              onChange={(e) => setSourceAccount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Không trích (Chỉ ghi chép theo dõi) --</option>
              {accounts
                .filter((a) => a.type !== "savings")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatVND(a.current_balance)})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              * Tiền trích sẽ được luân chuyển an toàn sang mục tiết kiệm (không tính vào chi tiêu sinh hoạt).
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Số tiền gửi (VND)
            </label>
            <input
              type="number"
              min="100000"
              step="100000"
              placeholder="VD: 50000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
          </div>

          {/* Term & Interest Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Kỳ hạn
              </label>
              <select
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value={1}>1 tháng</option>
                <option value={3}>3 tháng</option>
                <option value={6}>6 tháng</option>
                <option value={9}>9 tháng</option>
                <option value={12}>12 tháng (1 năm)</option>
                <option value={18}>18 tháng</option>
                <option value={24}>24 tháng (2 năm)</option>
                <option value={36}>36 tháng (3 năm)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Lãi suất (% / năm)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="30"
                placeholder="VD: 5.5"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Start Date & Payout Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Ngày gửi
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Trả lãi
              </label>
              <select
                value={payoutType}
                onChange={(e) => setPayoutType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="end_of_term">Lãi cuối kỳ</option>
                <option value="monthly">Lãi hàng tháng</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Ghi chú
            </label>
            <input
              type="text"
              placeholder="VD: Sổ gửi phòng ngừa rủi ro, gửi online..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Realtime calculation box */}
          {Number(amount) > 0 && (
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Ngày đáo hạn:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{preview.maturity}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Tiền lãi dự tính:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatVND(preview.interest)}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-200 font-semibold border-t border-slate-200 dark:border-slate-700 pt-1.5">
                <span>Tổng nhận khi đáo hạn:</span>
                <span className="text-blue-600 dark:text-blue-400">{formatVND(preview.total)}</span>
              </div>
            </div>
          )}

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
              className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Đang xử lý..." : "Mở sổ tiết kiệm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
