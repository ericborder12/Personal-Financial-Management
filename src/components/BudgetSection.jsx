import { CATEGORIES, formatVND } from "../constants";
import { getStatus } from "../utils/budget";

const BAR = { ok: "bg-emerald-500", near: "bg-amber-500", over: "bg-rose-500" };
const TEXT = { ok: "text-slate-500", near: "text-amber-600", over: "text-rose-600" };

export default function BudgetSection({ budgets, spent, pool, onEdit, onPayFixed }) {
  const items = CATEGORIES.expense
    .filter((c) => budgets[c.name])
    .map((c) => ({ ...c, ...budgets[c.name], spent: spent[c.name] || 0 }));

  const totalLimit = items.reduce((a, i) => a + i.limit, 0);
  const unallocated = pool - totalLimit;
  const overItems = items.filter((i) => i.spent > i.limit);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Ngân sách tháng</h2>
        <button
          onClick={onEdit}
          className="rounded-lg bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
        >
          ⚙️ Thiết lập
        </button>
      </div>

      {overItems.length > 0 && (
        <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          ⚠️ Đã vượt hạn mức: <b>{overItems.map((i) => i.name).join(", ")}</b>
        </div>
      )}

      {unallocated < 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 ring-1 ring-amber-200">
          ⚠️ Tổng hạn mức vượt số tiền hiện có {formatVND(-unallocated)}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
          Chưa đặt hạn mức nào. Bấm "Thiết lập" để chia tiền theo danh mục.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
              <p className="text-slate-500">Tiền có</p>
              <p className="mt-0.5 font-semibold text-slate-800">{formatVND(pool)}</p>
            </div>
            <div className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
              <p className="text-slate-500">Đã phân bổ</p>
              <p className="mt-0.5 font-semibold text-indigo-600">{formatVND(totalLimit)}</p>
            </div>
            <div className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
              <p className="text-slate-500">Chưa phân bổ</p>
              <p className={`mt-0.5 font-semibold ${unallocated < 0 ? "text-rose-600" : "text-slate-800"}`}>
                {formatVND(unallocated)}
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            {items.map((i) => {
              const status = getStatus(i.spent, i.limit);
              const percent = Math.min(100, (i.spent / i.limit) * 100);
              const paid = i.spent >= i.limit;
              return (
                <li key={i.name} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800">
                      {i.icon} {i.name}
                      {i.fixed && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          Cố định
                        </span>
                      )}
                    </p>
                    <p className={`text-sm font-semibold ${TEXT[status]}`}>
                      {status === "over"
                        ? `Vượt ${formatVND(i.spent - i.limit)}`
                        : `Còn ${formatVND(i.limit - i.spent)}`}
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${BAR[status]}`} style={{ width: `${percent}%` }} />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {formatVND(i.spent)} / {formatVND(i.limit)}
                    </span>
                    {i.fixed &&
                      (paid ? (
                        <span className="font-medium text-emerald-600">✓ Đã trả</span>
                      ) : (
                        <button
                          onClick={() => onPayFixed(i.name, i.limit - i.spent)}
                          className="rounded-lg bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-700"
                        >
                          Đánh dấu đã trả
                        </button>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}