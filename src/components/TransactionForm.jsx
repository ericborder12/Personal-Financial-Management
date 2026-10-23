import { useState } from "react";
import { CATEGORIES, formatVND } from "../constants";
import { getSpentByCategory } from "../utils/budget";

// Ngày theo giờ máy (toISOString dùng giờ UTC nên có thể lệch ngày)
const today = () => new Date().toLocaleDateString("sv-SE");

export default function TransactionForm({ type, transactions, budgets, onAdd, onClose }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[type][0].name);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  const isIncome = type === "income";
  const value = Number(amount);

  // Tính tình trạng hạn mức của danh mục đang chọn
  const budget = isIncome ? null : budgets[category];
  const spent = budget ? getSpentByCategory(transactions, date.slice(0, 7))[category] || 0 : 0;
  let warning = null;
  if (budget && value > 0) {
    const after = spent + value;
    if (after > budget.limit) {
      warning = {
        level: "over",
        text: `Vượt hạn mức "${category}" ${formatVND(after - budget.limit)}`,
      };
    } else if (after >= budget.limit * 0.8) {
      warning = {
        level: "near",
        text: `Sắp hết hạn mức "${category}", sau khoản này còn ${formatVND(budget.limit - after)}`,
      };
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!Number.isInteger(value) || value <= 0) return;
    if (warning?.level === "over" && !window.confirm(`${warning.text}.\nVẫn lưu giao dịch này?`)) return;
    onAdd({ type, amount: value, category, date, note: note.trim() });
    onClose();
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-5 rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
            {isIncome ? "+ Khoản thu" : "− Khoản chi"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
            className="w-full border-b-2 border-slate-200 bg-transparent pb-2 text-4xl font-bold text-slate-800 outline-none placeholder-slate-300 focus:border-indigo-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <p className="mt-1 h-5 text-sm text-slate-500">{value > 0 ? formatVND(value) : ""}</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Danh mục</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES[type].map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCategory(c.name)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  category === c.name
                    ? isIncome
                      ? "bg-emerald-500 text-white"
                      : "bg-rose-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>

          {budget && (
            <p className="mt-2 text-sm text-slate-500">
              Hạn mức còn lại: <b>{formatVND(Math.max(0, budget.limit - spent))}</b> / {formatVND(budget.limit)}
            </p>
          )}
          {warning && (
            <p
              className={`mt-2 rounded-lg p-2 text-sm ${
                warning.level === "over" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              ⚠️ {warning.text}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
          <input
            type="text"
            placeholder="Ghi chú"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className={`w-full rounded-xl py-3 text-lg font-semibold text-white transition active:scale-95 ${
            isIncome ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
          }`}
        >
          Lưu giao dịch
        </button>
      </form>
    </div>
  );
}