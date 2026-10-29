import { useState } from "react";
import { CATEGORIES, formatVND } from "../constants";

export default function BudgetEditor({ budgets, pool, onSave, onClose }) {
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(
      CATEGORIES.expense.map((c) => [
        c.name,
        { limit: budgets[c.name]?.limit ?? 0, fixed: budgets[c.name]?.fixed ?? false },
      ])
    )
  );

  const update = (name, patch) => setDraft((d) => ({ ...d, [name]: { ...d[name], ...patch } }));

  const total = Object.values(draft).reduce((a, b) => a + b.limit, 0);
  const remain = pool - total;

  const handleSave = () => {
    const result = {};
    for (const [name, b] of Object.entries(draft)) {
      if (b.limit > 0) result[name] = b;
    }
    onSave(result);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Thiết lập hạn mức</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Tiền có trong tháng</span>
            <b>{formatVND(pool)}</b>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tổng hạn mức</span>
            <b className="text-indigo-600">{formatVND(total)}</b>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Chưa phân bổ</span>
            <b className={remain < 0 ? "text-rose-600" : "text-emerald-600"}>{formatVND(remain)}</b>
          </div>
        </div>

        <ul className="space-y-3">
          {CATEGORIES.expense.map((c) => (
            <li key={c.name} className="rounded-xl border border-slate-100 p-3">
              <p className="mb-2 font-medium text-slate-700">
                {c.icon} {c.name}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center rounded-lg border border-slate-200 bg-slate-50 px-3">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={draft[c.name].limit || ""}
                    onChange={(e) =>
                      update(c.name, { limit: Math.max(0, Math.floor(Number(e.target.value)) || 0) })
                    }
                    className="w-full bg-transparent py-2 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-slate-400">đ</span>
                </div>
                <label className="flex items-center gap-1 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={draft[c.name].fixed}
                    onChange={(e) => update(c.name, { fixed: e.target.checked })}
                  />
                  Cố định
                </label>
              </div>
            </li>
          ))}
        </ul>

        <button
          onClick={handleSave}
          className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-lg font-semibold text-white hover:bg-indigo-700 active:scale-95"
        >
          Lưu hạn mức
        </button>
      </div>
    </div>
  );
}