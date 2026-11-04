import React from "react";
import {
  IconDashboard,
  IconTransactions,
  IconAccounts,
  IconCategories,
  IconBudgets,
  IconReports,
  IconX,
} from "../common/Icons";

const NAV_ITEMS = [
  { id: "dashboard", label: "Tổng quan", icon: IconDashboard },
  { id: "transactions", label: "Sổ giao dịch", icon: IconTransactions },
  { id: "accounts", label: "Tài khoản tiền", icon: IconAccounts },
  { id: "categories", label: "Danh mục thu chi", icon: IconCategories },
  { id: "budgets", label: "Ngân sách tháng", icon: IconBudgets },
  { id: "reports", label: "Báo cáo & Phân tích", icon: IconReports },
];

export default function Sidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/90 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-sm shadow-blue-500/20">
              ₫
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                FinanceFlow
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Tài chính cá nhân
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Đóng thanh điều hướng"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Điều hướng
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`group cursor-pointer flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info pill */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Tiền tệ</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-blue-600 shadow-2xs dark:bg-slate-700 dark:text-blue-300">
                VNĐ
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Đồng bộ tự động theo thời gian thực</p>
          </div>
        </div>
      </aside>
    </>
  );
}
