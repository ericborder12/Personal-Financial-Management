const fmt = (n) => n.toLocaleString("vi-VN") + "đ";

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

  const balance = initialBalance + sum(transactions, "income") - sum(transactions, "expense");

  return (
    <div className="space-y-4 rounded-xl bg-white p-6 shadow">
      <div>
        <p className="text-sm text-gray-500">Số dư hiện tại</p>
        <p className={`text-3xl font-bold ${balance < 0 ? "text-red-600" : "text-gray-900"}`}>
          {fmt(balance)}
        </p>
      </div>

      <label className="block text-sm text-gray-600">
        Số dư ban đầu (VND)
        <input
          type="number"
          min="0"
          step="1"
          value={initialBalance || ""}
          placeholder="0"
          onChange={(e) => onInitialBalanceChange(Math.max(0, Math.floor(Number(e.target.value)) || 0))}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onAddClick("income")}
          className="rounded-lg bg-green-500 py-3 text-lg font-semibold text-white hover:bg-green-600"
        >
          + Thu
        </button>
        <button
          onClick={() => onAddClick("expense")}
          className="rounded-lg bg-red-500 py-3 text-lg font-semibold text-white hover:bg-red-600"
        >
          − Chi
        </button>
      </div>

      <div className="border-t pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-medium">Thống kê tháng</p>
          <input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-green-50 p-2">
            <p className="text-gray-500">Thu</p>
            <p className="font-semibold text-green-600">{fmt(monthIncome)}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-2">
            <p className="text-gray-500">Chi</p>
            <p className="font-semibold text-red-600">{fmt(monthExpense)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-gray-500">Chênh lệch</p>
            <p className="font-semibold">{fmt(monthIncome - monthExpense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}