import React from "react";
import { formatVND } from "../../constants";

export default function BudgetCard({ budget, onEdit, onDelete }) {
  const percentage = budget.percentage || 0;
  const progressWidth = Math.min(percentage, 100);

  const getStatusBadge = () => {
    if (budget.status === "danger" || percentage >= 100) {
      return (
        <span className="rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          Vượt {percentage}%
        </span>
      );
    }
    if (budget.status === "warning" || percentage >= 80) {
      return (
        <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          Cảnh báo {percentage}%
        </span>
      );
    }
    return (
      <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
        An toàn {percentage}%
      </span>
    );
  };

  const getBarColor = () => {
    if (budget.status === "danger" || percentage >= 100) return "bg-rose-500";
    if (budget.status === "warning" || percentage >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3.5 w-3.5 rounded-md"
              style={{ backgroundColor: budget.category_color || "#3B82F6" }}
            />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white my-0">
              {budget.category_name}
            </h3>
          </div>
          {budget.limit > 0 && getStatusBadge()}
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400">Đã chi</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {formatVND(budget.spent)}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-slate-400">Hạn mức</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {budget.limit > 0 ? formatVND(budget.limit) : "Chưa đặt"}
            </span>
          </div>
          {budget.limit > 0 && (
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">Còn lại</span>
              <span
                className={`font-semibold ${
                  budget.remaining > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatVND(budget.remaining)}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {budget.limit > 0 && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <button
          onClick={() => onEdit(budget)}
          className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          {budget.limit > 0 ? "Chỉnh sửa hạn mức" : "+ Đặt hạn mức"}
        </button>
        {budget.id && (
          <button
            onClick={() => onDelete(budget.id)}
            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
            title="Xóa hạn mức"
          >
            Xóa
          </button>
        )}
      </div>
    </div>
  );
}
