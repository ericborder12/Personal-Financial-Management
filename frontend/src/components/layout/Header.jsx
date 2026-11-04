import React from "react";
import {
  IconMenu,
  IconPlus,
  IconSun,
  IconMoon,
  IconLogOut,
} from "../common/Icons";

const TITLES = {
  dashboard: "Tổng quan tài chính",
  transactions: "Sổ giao dịch thu chi",
  accounts: "Tài khoản tiền & Ví",
  categories: "Danh mục phân loại",
  budgets: "Hạn mức ngân sách tháng",
  reports: "Báo cáo & Phân tích chi tiêu",
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
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 sm:px-8 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      {/* Left: Mobile hamburger & Active Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="cursor-pointer rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors lg:hidden"
          aria-label="Mở menu"
        >
          <IconMenu className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white my-0 tracking-tight leading-tight">
            {TITLES[activeTab] || "Quản lý tài chính"}
          </h1>
        </div>
      </div>

      {/* Right: Quick Action, Theme Toggle, User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick Transaction Action */}
        <button
          onClick={onOpenQuickTransaction}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <IconPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Giao dịch mới</span>
          <span className="sm:hidden">Thêm</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="cursor-pointer rounded-xl border border-slate-200/90 p-2.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500"
          title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          aria-label="Đổi giao diện sáng/tối"
        >
          {darkMode ? <IconSun className="w-5 h-5 text-amber-400" /> : <IconMoon className="w-5 h-5 text-slate-600" />}
        </button>

        {/* User Pill (Opens Profile Modal) & Logout */}
        <div className="flex items-center gap-2 border-l border-slate-200/90 pl-3 sm:pl-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onOpenProfile}
            className="cursor-pointer group flex items-center gap-2.5 rounded-xl p-1.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-left"
            title="Nhấn để mở Hồ sơ & Cài đặt tài khoản"
            aria-label="Mở hồ sơ cá nhân"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-black text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
              {userInitial}
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 max-w-[150px] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {displayName}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Cài đặt hồ sơ
              </span>
            </div>
          </button>

          <button
            onClick={onLogout}
            className="cursor-pointer rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 focus-visible:ring-2 focus-visible:ring-rose-500"
            title="Đăng xuất khỏi hệ thống"
            aria-label="Đăng xuất"
          >
            <IconLogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
