import { useState } from "react";
import { api } from "../api/client";
import { errorMessage } from "../api/errors";
import { formatVND } from "../constants";
import {
  clearLegacy,
  normalizeBudgets,
  readLegacy,
} from "../utils/legacy";

export default function ImportDialog({ onClose }) {
  const [legacy] = useState(readLegacy);
  const [data, setData] = useState(() => ({
    transactions: legacy.transactions,
    budgets: legacy.budgets.filter((budget) => budget.limit > 0),
    initialBalance: legacy.initialBalance,
  }));
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  const hasData =
    data.transactions.length > 0 ||
    data.budgets.length > 0 ||
    data.initialBalance > 0;

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    try {
      const parsed = JSON.parse(await file.text());
      const next = {
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        budgets: normalizeBudgets(parsed.budgets).filter(
          (budget) => budget.limit > 0
        ),
        initialBalance: Number(parsed.initial_balance) || 0,
      };

      if (
        next.transactions.length === 0 &&
        next.budgets.length === 0 &&
        next.initialBalance <= 0
      ) {
        setError("File không có dữ liệu để nhập.");
        return;
      }

      setData(next);
      setFileName(file.name);
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "File JSON không hợp lệ."
          : err.message || "Không đọc được file."
      );
    }
  };

  const handleImport = async () => {
    if (!hasData || importing) return;

    setImporting(true);
    setError("");
    try {
      await api.importData({
        transactions: data.transactions.map((transaction) => ({
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          date: transaction.date,
          note: transaction.note ?? "",
        })),
        budgets: data.budgets,
        initial_balance: data.initialBalance,
      });
      clearLegacy();
      window.location.reload();
    } catch (err) {
      setError(
        err.status === 409
          ? "Tài khoản đã có dữ liệu."
          : errorMessage(err)
      );
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-800">
            Nhập dữ liệu cũ
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Chúng tôi tìm thấy dữ liệu lưu trên trình duyệt này. Nhập một lần để
          chuyển sang tài khoản của bạn.
        </p>

        <dl className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Giao dịch</dt>
            <dd className="font-semibold text-slate-800">
              {data.transactions.length}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Hạn mức</dt>
            <dd className="font-semibold text-slate-800">
              {data.budgets.length}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Số dư ban đầu</dt>
            <dd className="font-semibold text-slate-800">
              {formatVND(data.initialBalance)}
            </dd>
          </div>
        </dl>

        <label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-3 text-center text-sm text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50/50">
          <span className="font-medium text-indigo-600">
            {fileName || "Chọn file JSON khác"}
          </span>
          <span className="mt-0.5 block text-xs text-slate-400">
            {`{ transactions, budgets, initial_balance }`}
          </span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className="hidden"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 hover:bg-slate-200"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!hasData || importing}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? "Đang nhập..." : "Nhập dữ liệu"}
          </button>
        </div>
      </div>
    </div>
  );
}
