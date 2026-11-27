import React from "react";
import { formatVND } from "../../constants";

const COLOR_STYLES = {
  emerald: {
    icon: "border-[#bbf7d0] bg-[#ecfdf5] text-[#15803d] dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300",
    marker: "bg-[#22c55e]",
  },
  rose: {
    icon: "border-[#f2e0d9] bg-[#fbf1ed] text-[#b65d43] dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300",
    marker: "bg-[#e9967c]",
  },
  purple: {
    icon: "border-[#e5e0f0] bg-[#f4f1f8] text-[#6f62a8] dark:border-violet-900/50 dark:bg-violet-950/50 dark:text-violet-300",
    marker: "bg-[#8b7bbb]",
  },
};

export default function StatCard({ title, amount, subtitle, icon, color = "emerald" }) {
  const scheme = COLOR_STYLES[color] || COLOR_STYLES.emerald;

  return (
    <div className="flex min-w-0 flex-col justify-between rounded-[20px] border border-[#e4e9e3] bg-white p-5 shadow-[0_2px_8px_rgba(20,40,30,0.025)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cbd9cc] hover:shadow-[0_10px_24px_rgba(20,40,30,0.07)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <span className={`mt-3 block h-1 w-7 rounded-full ${scheme.marker}`} />
        </div>
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${scheme.icon}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-5 min-w-0">
        <div className="break-words text-[clamp(1.1rem,1.7vw,1.55rem)] font-extrabold leading-tight tracking-[-0.045em] text-slate-900 tabular-nums dark:text-white">
          {formatVND(amount)}
        </div>
        {subtitle && (
          <div className="mt-2 truncate text-xs font-medium capitalize text-slate-500 dark:text-slate-400">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
