import React from "react";
import { formatVND } from "../../constants";

export default function StatCard({ title, amount, subtitle, icon, trend, color = "blue" }) {
  const colorStyles = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 border-blue-100 dark:border-blue-900/40",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900/40",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400 border-purple-100 dark:border-purple-900/40",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colorStyles[color] || colorStyles.blue}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {formatVND(amount)}
        </div>
        {subtitle && (
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            {trend && <span className="font-medium">{trend}</span>}
            <span>{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}
