import React from "react";
import { IconMenu, IconPlus, IconSun, IconMoon, IconLogOut } from "../common/Icons";

const TITLES = {
  dashboard: "Tổng quan tài chính",
  transactions: "Sổ giao dịch thu chi",
  accounts: "Tài khoản tiền & Ví",
  savings: "Sổ tiết kiệm",
  categories: "Danh mục phân loại",
  budgets: "Hạn mức ngân sách tháng",
  reports: "Báo cáo & Phân tích chi tiêu",
  qa: "Trợ lý AI & Hỏi đáp",
  support: "Hỗ trợ & Góp ý",
};

export default function Header({
  activeTab,
  user,
  onLogout,
  onOpenQuickTransaction,
  setMobileOpen,
  onOpenProfile,
  darkMode,
  setDarkMode,
}) {
  const displayName = user?.display_name || user?.email || "Người dùng";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] w-full items-center justify-between border-b border-[#e5e9e3] bg-[#fbfcfa]/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-[#101912]/95 sm:px-6 xl:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="cursor-pointer rounded-xl p-2 text-slate-500 transition-colors hover:bg-[#eef2ec] hover:text-[#173b2d] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
          aria-label="Mở menu"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[#87958a] sm:block">
            FinanceFlow
          </p>
          <h1 className="truncate text-[17px] font-extrabold tracking-[-0.04em] text-[#1b2a20] dark:text-white sm:mt-0.5 sm:text-[19px]">
            {TITLES[activeTab] || "Quản lý tài chính"}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenQuickTransaction}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#16a34a] px-3 py-2.5 text-xs font-bold text-white shadow-[0_3px_10px_rgba(22,163,74,0.22)] transition-all hover:bg-[#15803d] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 sm:px-4 sm:text-sm"
        >
          <IconPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Giao dịch mới</span>
          <span className="sm:hidden">Thêm</span>
        </button>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="cursor-pointer rounded-xl border border-[#e2e7e0] p-2.5 text-slate-500 transition-colors hover:bg-[#f0f3ee] hover:text-[#16a34a] dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          aria-label="Đổi giao diện sáng/tối"
        >
          {darkMode ? (
            <IconSun className="h-4 w-4 text-amber-300" />
          ) : (
            <IconMoon className="h-4 w-4" />
          )}
        </button>

        <div className="flex items-center gap-1.5 border-l border-[#e3e8e1] pl-2 dark:border-slate-800 sm:gap-2 sm:pl-3">
          <button
            type="button"
            onClick={onOpenProfile}
            className="group flex cursor-pointer items-center gap-2 rounded-xl p-1 text-left transition-colors hover:bg-[#eef2ec] dark:hover:bg-slate-800 sm:gap-2.5 sm:p-1.5"
            title="Mở hồ sơ cá nhân"
            aria-label="Mở hồ sơ cá nhân"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-[#dcfce7] text-xs font-extrabold text-[#15803d] dark:bg-emerald-950 dark:text-emerald-300">
              {userInitial}
            </div>
            <div className="hidden min-w-0 md:block">
              <span className="block max-w-[150px] truncate text-xs font-bold text-slate-800 transition-colors group-hover:text-[#16a34a] dark:text-slate-200 dark:group-hover:text-emerald-300">
                {displayName}
              </span>
              <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                Hồ sơ cá nhân
              </span>
            </div>
          </button>
          <button
            onClick={onLogout}
            className="cursor-pointer rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            title="Đăng xuất khỏi hệ thống"
            aria-label="Đăng xuất"
          >
            <IconLogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
