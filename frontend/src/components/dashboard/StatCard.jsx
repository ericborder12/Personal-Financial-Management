import React from "react";
import { formatVND } from "../../constants";

export default function StatCard({ title, amount, subtitle, icon, trend, color = "blue" }) {
  const colorStyles = {
    blue: {
      badge: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400 border-blue-100 dark:border-blue-900/40",
      accent: "bg-blue-500",
      text: "text-blue-600 dark:text-blue-400",
    },
    emerald: {
      badge: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40",
      accent: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    rose: {
      badge: "text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 border-rose-100 dark:border-rose-900/40",
      accent: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-400",
    },
    purple: {
      badge: "text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400 border-purple-100 dark:border-purple-900/40",
      accent: "bg-purple-500",
      text: "text-purple-600 dark:text-purple-400",
    },
  };

  const scheme = colorStyles[color] || colorStyles.blue;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Top micro accent bar on hover */}
      <div className={`absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${scheme.accent}`} />

      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${scheme.badge}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3.5">
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
          {formatVND(amount)}
        </div>
        {subtitle && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {trend && <span className={`font-semibold ${scheme.text}`}>{trend}</span>}
            <span>{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}
