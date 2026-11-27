import React from "react";
import { formatVND } from "../../constants";
import { IconBudgets } from "../common/Icons";

export default function BudgetProgressWidget({ budgets = [], onManageBudgets }) {
  const activeBudgets = budgets.filter((budget) => budget.limit > 0);

  if (activeBudgets.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfe7de] px-5 py-8 text-center dark:border-slate-700">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f6ef] text-[#718879] dark:bg-slate-800 dark:text-slate-400">
          <IconBudgets className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
          Chưa thiết lập ngân sách
        </p>
        <span className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
          Đặt hạn mức theo danh mục để dễ theo dõi chi tiêu trong tháng.
        </span>
        <button
          onClick={onManageBudgets}
          className="mt-4 cursor-pointer rounded-xl bg-[#dcfce7] px-4 py-2.5 text-xs font-bold text-[#15803d] transition-colors hover:bg-[#bbf7d0] dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950"
        >
          + Tạo ngân sách
        </button>
      </div>
    );
  }

  const getStatusBadge = (status, percentage) => {
    if (status === "danger" || percentage >= 100) {
      return (
        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
          Vượt {percentage}%
        </span>
      );
    }
    if (status === "warning" || percentage >= 80) {
      return (
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          Gần mức tối đa · {percentage}%
        </span>
      );
    }
    return (
      <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[10px] font-bold text-[#15803d] dark:bg-emerald-950/60 dark:text-emerald-300">
        {percentage}% đã dùng
      </span>
    );
  };

  const getBarColor = (status, percentage) => {
    if (status === "danger" || percentage >= 100) return "bg-rose-500";
    if (status === "warning" || percentage >= 80) return "bg-amber-500";
    return "bg-[#22c55e]";
  };

  return (
    <div className="space-y-5">
      {activeBudgets.slice(0, 5).map((budget) => {
        const percentage = budget.percentage || 0;
        const progressWidth = Math.min(percentage, 100);

        return (
          <div key={budget.category_id || budget.id} className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {budget.category_name}
              </span>
              {getStatusBadge(budget.status, percentage)}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef1ed] dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                  budget.status,
                  percentage
                )}`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {formatVND(budget.spent)} <span className="text-slate-300 dark:text-slate-600">/</span> {formatVND(budget.limit)}
            </p>
          </div>
        );
      })}

      {activeBudgets.length > 5 && (
        <button
          onClick={onManageBudgets}
          className="w-full cursor-pointer border-t border-[#edf0ec] pt-4 text-left text-xs font-bold text-[#16a34a] transition-colors hover:text-[#15803d] dark:border-slate-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          Xem tất cả {activeBudgets.length} ngân sách <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
