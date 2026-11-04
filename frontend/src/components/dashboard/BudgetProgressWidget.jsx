import React from "react";
import { formatVND } from "../../constants";

export default function BudgetProgressWidget({ budgets = [], onManageBudgets }) {
  const activeBudgets = budgets.filter((b) => b.limit > 0);

  if (activeBudgets.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Chưa thiết lập hạn mức ngân sách tháng này.
        </p>
        <button
          onClick={onManageBudgets}
          className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          + Thiết lập ngân sách ngay
        </button>
      </div>
    );
  }

  const getStatusBadge = (status, percentage) => {
    if (status === "danger" || percentage >= 100) {
      return (
        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          Vượt {percentage}%
        </span>
      );
    }
    if (status === "warning" || percentage >= 80) {
      return (
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          Cảnh báo {percentage}%
        </span>
      );
    }
    return (
      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
        An toàn {percentage}%
      </span>
    );
  };

  const getBarColor = (status, percentage) => {
    if (status === "danger" || percentage >= 100) return "bg-rose-500";
    if (status === "warning" || percentage >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="space-y-4">
      {activeBudgets.slice(0, 5).map((budget) => {
        const percentage = budget.percentage || 0;
        const progressWidth = Math.min(percentage, 100);

        return (
          <div key={budget.category_id || budget.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {budget.category_name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">
                  {formatVND(budget.spent)} / {formatVND(budget.limit)}
                </span>
                {getStatusBadge(budget.status, percentage)}
              </div>
            </div>

            {/* Progress Track */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                  budget.status,
                  percentage
                )}`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>
        );
      })}

      {activeBudgets.length > 5 && (
        <button
          onClick={onManageBudgets}
          className="w-full pt-1 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Xem tất cả {activeBudgets.length} danh mục ngân sách →
        </button>
      )}
    </div>
  );
}
