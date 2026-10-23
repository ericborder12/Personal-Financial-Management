import { formatVND } from "../constants";

export default function Summary({
  transactions,
  initialBalance,
  onInitialBalanceChange,
  month,
  onMonthChange,
  onAddClick,
}) {
  const sum = (list, type) =>
    list.filter((t) => t.type === type).reduce((acc, t) => acc + t.amount, 0);

  const monthList = transactions.filter((t) => t.date.startsWith(month));
  const monthIncome = sum(monthList, "income");
  const monthExpense = sum(monthList, "expense");
  const diff = monthIncome - monthExpense;

  const balance = initialBalance + sum(transactions, "income") - sum(transactions, "expense");

  return (
    <div className="space-y-4">
      {/* Thẻ số dư */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg shadow-indigo-500/30">
        <p className="text-sm text-white/80">Số dư hiện tại</p>
        <p className={`mt-1 text-4xl font-bold tracking-tight ${balance < 0 ? "text-red-200" : ""}`}>
          {formatVND(balance)}
        </p>

        <label className="mt-5 block text-xs text-white/70">
          Số dư ban đầu
          <div className="mt-1 flex items-center rounded-xl bg-white/15 px-3 backdrop-blur">
            <input
              type="number"
              min="0"
              step="1"
              value={initialBalance || ""}
              placeholder="0"
              onChange={(e) =>
                onInitialBalanceChange(Math.max(0, Math.floor(Number(e.target.value)) || 0))
              }
              className="w-full bg-transparent py-2 text-base text-white placeholder-white/50 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-white/70">đ</span>
          </div>
        </label>
      </div>

      {/* Nút Thu / Chi */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onAddClick("income")}
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-95"
        >
          <span className="text-2xl leading-none">+</span> Thu
        </button>
        <button
          onClick={() => onAddClick("expense")}
          className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500 py-4 text-lg font-semibold text-white shadow-md shadow-rose-500/30 transition hover:bg-rose-600 active:scale-95"
        >
          <span className="text-2xl leading-none">−</span> Chi
        </button>
      </div>

      {/* Thống kê tháng */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Thống kê tháng</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xs text-slate-500">Thu</p>
            <p className="mt-1 text-sm font-semibold text-emerald-600">{formatVND(monthIncome)}</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-3">
            <p className="text-xs text-slate-500">Chi</p>
            <p className="mt-1 text-sm font-semibold text-rose-600">{formatVND(monthExpense)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Chênh lệch</p>
            <p className={`mt-1 text-sm font-semibold ${diff < 0 ? "text-rose-600" : "text-slate-800"}`}>
              {diff > 0 ? "+" : ""}{formatVND(diff)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}