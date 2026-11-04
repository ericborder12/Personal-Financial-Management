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
  { id: "transactions", label: "Giao dịch", icon: IconTransactions },
  { id: "accounts", label: "Tài khoản", icon: IconAccounts },
  { id: "categories", label: "Danh mục", icon: IconCategories },
  { id: "budgets", label: "Ngân sách", icon: IconBudgets },
  { id: "reports", label: "Báo cáo & Phân tích", icon: IconReports },
];

export default function Sidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
              ₫
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white tracking-tight">
                FinanceFlow
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
                Cá nhân
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Menu chính
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
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-600 shadow-xs dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Đơn vị tiền tệ</p>
            <p className="mt-0.5">Việt Nam Đồng (VNĐ)</p>
          </div>
        </div>
      </aside>
    </>
  );
}
