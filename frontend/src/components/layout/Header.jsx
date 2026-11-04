import React, { useEffect, useState } from "react";
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
}) {
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const userInitial = (user?.email || "U").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      {/* Left: Mobile hamburger & Active Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="cursor-pointer rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors lg:hidden"
          aria-label="Mở menu"
        >
          <IconMenu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white my-0 leading-tight">
            {TITLES[activeTab] || "Quản lý tài chính"}
          </h1>
        </div>
      </div>

      {/* Right: Quick Action, Theme Toggle, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Transaction Action */}
        <button
          onClick={onOpenQuickTransaction}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <IconPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Giao dịch mới</span>
          <span className="sm:hidden">Thêm</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="cursor-pointer rounded-xl border border-slate-200/90 p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500"
          title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          aria-label="Đổi giao diện sáng/tối"
        >
          {darkMode ? <IconSun className="w-4 h-4 text-amber-400" /> : <IconMoon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Pill & Logout */}
        <div className="flex items-center gap-2.5 border-l border-slate-200/80 pl-3 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-2xs">
            {userInitial}
          </div>

          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
              {user?.email || "Người dùng"}
            </span>
            <span className="text-[10px] text-slate-400">Đang hoạt động</span>
          </div>

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
