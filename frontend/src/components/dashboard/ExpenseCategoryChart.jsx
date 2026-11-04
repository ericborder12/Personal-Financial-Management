import React from "react";
import { formatVND } from "../../constants";
import { IconCategories } from "../common/Icons";

export default function ExpenseCategoryChart({ categoryExpenses = [], totalExpense = 0 }) {
  if (!categoryExpenses || categoryExpenses.length === 0 || totalExpense === 0) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 p-6 text-center dark:border-slate-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
          <IconCategories className="w-6 h-6" />
        </div>
        <p className="mt-3 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
          Chưa có chi tiêu trong tháng này
        </p>
        <span className="mt-1 text-xs text-slate-400 max-w-xs">
          Phân bổ theo danh mục sẽ xuất hiện tự động ngay khi bạn ghi nhận khoản chi tiêu đầu tiên.
        </span>
      </div>
    );
  }

  // Predefined vibrant, accessible palette
  const fallbackColors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#64748B"
  ];

  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const arcs = categoryExpenses.map((cat, idx) => {
    const prevPercent = categoryExpenses
      .slice(0, idx)
      .reduce((sum, c) => sum + (c.percentage || 0), 0);
    return {
      ...cat,
      strokeDasharray: `${((cat.percentage || 0) / 100) * circumference} ${circumference}`,
      strokeDashoffset: -((prevPercent / 100) * circumference),
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg width={size} height={size} className="-rotate-90 transform">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800"
          />
          {arcs.map((cat, idx) => {
            const color = cat.category_color || fallbackColors[idx % fallbackColors.length];

            return (
              <circle
                key={cat.category_id || idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={cat.strokeDasharray}
                strokeDashoffset={cat.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 hover:opacity-80"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tổng chi
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-tight mt-0.5">
            {formatVND(totalExpense)}
          </span>
        </div>
      </div>

      {/* Legend & Breakdown List */}
      <div className="flex-1 w-full space-y-2 max-h-60 overflow-y-auto pr-1">
        {categoryExpenses.map((cat, idx) => {
          const color = cat.category_color || fallbackColors[idx % fallbackColors.length];
          return (
            <div
              key={cat.category_id || idx}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="h-3.5 w-3.5 rounded-md shrink-0 shadow-2xs"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                  {cat.category_name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 tabular-nums">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {formatVND(cat.amount)}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {cat.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
