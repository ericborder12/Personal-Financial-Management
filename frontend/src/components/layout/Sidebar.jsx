import React from "react";
import {
  IconDashboard,
  IconTransactions,
  IconAccounts,
  IconCategories,
  IconBudgets,
  IconReports,
  IconVault,
  IconSparkles,
  IconX,
  IconShield,
  IconArrowUpRight,
} from "../common/Icons";

const NAV_ITEMS = [
  { id: "dashboard", label: "Tổng quan", icon: IconDashboard },
  { id: "transactions", label: "Sổ giao dịch", icon: IconTransactions },
  { id: "accounts", label: "Tài khoản tiền", icon: IconAccounts },
  { id: "savings", label: "Sổ tiết kiệm", icon: IconVault },
  { id: "categories", label: "Danh mục thu chi", icon: IconCategories },
  { id: "budgets", label: "Ngân sách tháng", icon: IconBudgets },
  { id: "reports", label: "Báo cáo & Phân tích", icon: IconReports },
  { id: "qa", label: "Trợ lý AI & Hỏi đáp", icon: IconSparkles },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
  user,
  onOpenProfile,
}) {
  const displayName = user?.display_name || user?.email || "Người dùng";
  const userInitial = displayName.charAt(0).toUpperCase();

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

      {/* Sidebar container: widened to 72 (288px) for comfortable readability */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/90 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 shrink-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl shadow-md shadow-blue-500/25">
              $
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white leading-none block">
                FinanceFlow
              </span>
              <span className="block mt-1 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Tài chính cá nhân
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="cursor-pointer rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Đóng thanh điều hướng"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          <div className="px-3.5 py-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
            Điều hướng chính
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
                className={`group cursor-pointer flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 ring-4 ring-blue-100 dark:ring-blue-900/40" />
                )}
              </button>
            );
          })}

          {/* Dành riêng cho Quản trị viên (Staff / Superuser) */}
          {(user?.is_staff || user?.is_superuser) && (
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-rose-500 uppercase flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Quyền Quản Trị</span>
              </div>
              <a
                href="/admin/finance/aisecurityalert/"
                target="_blank"
                rel="noopener noreferrer"
                className="group cursor-pointer flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/70 border border-rose-200/80 dark:border-rose-900/60 transition-all shadow-xs"
                title="Mở Bảng điều khiển Quản trị & Cảnh báo an toàn hệ thống"
              >
                <div className="flex items-center gap-2.5">
                  <IconShield className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="truncate">Cảnh báo & Quản trị</span>
                </div>
                <IconArrowUpRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          )}
        </nav>

        {/* User Profile Card & Footer Info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          {onOpenProfile && (
            <button
              type="button"
              onClick={() => {
                onOpenProfile();
                setMobileOpen(false);
              }}
              className="cursor-pointer group flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-left transition-all hover:bg-slate-100/80 hover:border-blue-200 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:hover:border-slate-700"
              title="Xem và chỉnh sửa hồ sơ cá nhân"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-black text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {displayName}
                </p>
                <p className="text-[11px] font-semibold text-slate-400 group-hover:text-blue-500 transition-colors">
                  Hồ sơ & Bảo mật →
                </p>
              </div>
            </button>
          )}

          <div className="rounded-xl bg-slate-50/60 p-3 text-xs text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 border border-slate-200/70 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Tiền tệ</span>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600 border border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/40">
                VNĐ (₫)
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đồng bộ thời gian thực</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
