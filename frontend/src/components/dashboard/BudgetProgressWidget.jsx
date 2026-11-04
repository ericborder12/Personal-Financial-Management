import React from "react";
import { formatVND } from "../../constants";
import { IconBudgets } from "../common/Icons";

export default function BudgetProgressWidget({ budgets = [], onManageBudgets }) {
  const activeBudgets = budgets.filter((b) => b.limit > 0);

  if (activeBudgets.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 p-6 text-center dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
          <IconBudgets className="w-5 h-5" />
        </div>
        <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
          Chưa thiết lập hạn mức ngân sách
        </p>
        <span className="mt-1 text-[11px] text-slate-400 max-w-xs">
          Đặt ngân sách cho từng danh mục để nhận cảnh báo khi chi tiêu vượt mức.
        </span>
        <button
          onClick={onManageBudgets}
          className="cursor-pointer mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/60"
        >
          + Đặt hạn mức ngay
        </button>
      </div>
    );
  }

  const getStatusBadge = (status, percentage) => {
    if (status === "danger" || percentage >= 100) {
      return (
        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
          Vượt {percentage}%
        </span>
      );
    }
    if (status === "warning" || percentage >= 80) {
      return (
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
          Cảnh báo {percentage}%
        </span>
      );
    }
    return (
      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
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
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {budget.category_name}
              </span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-slate-500 font-medium">
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
          className="cursor-pointer w-full pt-1 text-center text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
        >
          Xem tất cả {activeBudgets.length} danh mục ngân sách →
        </button>
      )}
    </div>
  );
}
