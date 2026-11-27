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
  IconChat,
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
  { id: "support", label: "Hỗ trợ & Góp ý", icon: IconChat },
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
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] shrink-0 flex-col border-r border-[#16a34a]/40 bg-gradient-to-b from-[#168a43] via-[#15803d] to-[#146c35] text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-white/15 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#dcfce7] text-lg font-black text-[#15803d] shadow-[0_5px_16px_rgba(0,0,0,0.12)]">
              $
            </div>
            <div>
              <span className="block text-[15px] font-extrabold tracking-[-0.04em] text-white">
                FinanceFlow
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-emerald-100/85">
                Tài chính cá nhân
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="cursor-pointer rounded-xl p-2 text-emerald-100/85 transition-colors hover:bg-white/15 hover:text-white lg:hidden"
            aria-label="Đóng thanh điều hướng"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-100/70">
            Không gian của bạn
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
                className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                  isActive
                    ? "bg-white/20 text-white shadow-[inset_3px_0_0_#dcfce7]"
                    : "text-emerald-50/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    isActive ? "text-[#dcfce7]" : "text-emerald-100/80 group-hover:text-white"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#dcfce7]" />}
              </button>
            );
          })}

          {(user?.is_staff || user?.is_superuser) && (
            <div className="mt-4 border-t border-white/15 pt-4">
              <div className="mb-2 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-200">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                Quyền quản trị
              </div>
              <a
                href="/admin/finance/aisecurityalert/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full cursor-pointer items-center justify-between rounded-xl border border-rose-300/35 bg-rose-950/30 px-3 py-2.5 text-xs font-bold text-rose-100 transition-colors hover:bg-rose-950/45"
                title="Mở Bảng điều khiển Quản trị & Cảnh báo an toàn hệ thống"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <IconShield className="h-4 w-4 shrink-0" />
                  <span className="truncate">Cảnh báo & Quản trị</span>
                </span>
                <IconArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
          )}
        </nav>

        <div className="space-y-3 border-t border-white/15 p-3.5">
          {onOpenProfile && (
            <button
              type="button"
              onClick={() => {
                onOpenProfile();
                setMobileOpen(false);
              }}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-3 text-left transition-colors hover:border-white/25 hover:bg-white/15"
              title="Xem và chỉnh sửa hồ sơ cá nhân"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7] text-sm font-extrabold text-[#15803d]">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{displayName}</p>
                <p className="mt-0.5 text-[10px] font-medium text-emerald-100/80 group-hover:text-white">
                  Hồ sơ & bảo mật
                </p>
              </div>
              <span className="text-emerald-100/80 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                →
              </span>
            </button>
          )}

          <div className="flex items-center justify-between px-1 text-[11px] text-emerald-100/80">
            <span>Đơn vị tiền tệ</span>
            <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1 font-semibold text-[#dcfce7]">
              VNĐ · ₫
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
