import React from "react";
import { IconSearch } from "../common/Icons";

export default function TransactionFilterBar({
  filters,
  onChange,
  onReset,
  categories = [],
  accounts = [],
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3.5">
      {/* Top row: Search and Type Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <IconSearch className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo ghi chú, danh mục..."
            value={filters.search || ""}
            onChange={(e) => onChange("search", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9.5 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
          />
        </div>

        {/* Type selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "", label: "Tất cả" },
            { id: "income", label: "Thu nhập" },
            { id: "expense", label: "Chi tiêu" },
            { id: "transfer", label: "Chuyển tiền" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange("type", tab.id)}
              className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                (filters.type || "") === tab.id
                  ? "bg-slate-900 text-white dark:bg-blue-600 shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom row: Filters for Account, Category, Dates */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-xs">
        {/* Account select */}
        <div>
          <select
            value={filters.account || ""}
            onChange={(e) => onChange("account", e.target.value)}
            className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Tất cả tài khoản</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category select */}
        <div>
          <select
            value={filters.category || ""}
            onChange={(e) => onChange("category", e.target.value)}
            className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type === "income" ? "Thu" : "Chi"})
              </option>
            ))}
          </select>
        </div>

        {/* Start date */}
        <div>
          <input
            type="date"
            value={filters.start_date || ""}
            onChange={(e) => onChange("start_date", e.target.value)}
            className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Từ ngày"
          />
        </div>

        {/* End date + Reset */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filters.end_date || ""}
            onChange={(e) => onChange("end_date", e.target.value)}
            className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Đến ngày"
          />
          <button
            onClick={onReset}
            className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 shrink-0 transition-colors"
            title="Đặt lại bộ lọc"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
