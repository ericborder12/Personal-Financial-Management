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
  transactions: "Sổ giao dịch",
  accounts: "Tài khoản tiền",
  categories: "Danh mục thu chi",
  budgets: "Hạn mức ngân sách",
  reports: "Báo cáo & Phân tích",
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

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      {/* Left: Mobile menu toggle + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Open sidebar"
        >
          <IconMenu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white my-0 leading-tight">
            {TITLES[activeTab] || "Quản lý tài chính"}
          </h1>
        </div>
      </div>

      {/* Right: Quick Action, Theme Toggle, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenQuickTransaction}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-98"
        >
          <IconPlus className="w-4 h-4" />
          <span className="hidden sm:inline">+ Giao dịch</span>
          <span className="sm:hidden">Thêm</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title={darkMode ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        >
          {darkMode ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}
        </button>

        {/* User Pill & Logout */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
              {user?.email || "Người dùng"}
            </span>
            <span className="text-[10px] text-slate-400">Đã đăng nhập</span>
          </div>

          <button
            onClick={onLogout}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            title="Đăng xuất"
          >
            <IconLogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
