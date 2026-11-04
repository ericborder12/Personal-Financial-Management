import React from "react";
import { formatVND } from "../../constants";

export default function ExpenseCategoryChart({ categoryExpenses = [], totalExpense = 0 }) {
  if (!categoryExpenses || categoryExpenses.length === 0 || totalExpense === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Chưa có chi tiêu nào trong tháng này.
        </p>
        <span className="mt-1 text-xs text-slate-400">
          Các khoản chi sẽ hiển thị phân bổ theo danh mục tại đây.
        </span>
      </div>
    );
  }

  // Predefined vibrant palette if category doesn't have a valid color
  const fallbackColors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#06B6D4", "#F97316", "#64748B"
  ];

  // Calculate SVG Donut arcs
  const size = 180;
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
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center">
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
                className="transition-all duration-500"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Tổng chi
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatVND(totalExpense)}
          </span>
        </div>
      </div>

      {/* Legend & Breakdown List */}
      <div className="flex-1 w-full space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {categoryExpenses.map((cat, idx) => {
          const color = cat.category_color || fallbackColors[idx % fallbackColors.length];
          return (
            <div
              key={cat.category_id || idx}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-3 w-3 rounded-md shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                  {cat.category_name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatVND(cat.amount)}
                </span>
                <span className="w-11 text-right text-slate-500 font-medium">
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
