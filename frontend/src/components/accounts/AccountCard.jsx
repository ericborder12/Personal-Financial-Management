import React from "react";
import { formatVND } from "../../constants";
import { IconTransfer, IconEdit, IconTrash, IconWallet, IconBank } from "../common/Icons";

const TYPE_CONFIGS = {
  cash: {
    label: "Tiền mặt",
    icon: IconWallet,
    bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40",
  },
  bank: {
    label: "Ngân hàng",
    icon: IconBank,
    bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-900/40",
  },
  ewallet: {
    label: "Ví điện tử",
    icon: IconTransfer,
    bg: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200 dark:border-purple-900/40",
  },
  other: {
    label: "Khác",
    icon: IconWallet,
    bg: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  },
};

export default function AccountCard({ account, onEdit, onDelete, onTransferFrom }) {
  const typeConfig = TYPE_CONFIGS[account.type] || TYPE_CONFIGS.other;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${typeConfig.bg}`}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            <span>{typeConfig.label}</span>
          </span>

          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => onEdit(account)}
              className="cursor-pointer rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Chỉnh sửa tài khoản"
              aria-label="Sửa tài khoản"
            >
              <IconEdit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="cursor-pointer rounded-lg p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
              title="Lưu trữ / Ẩn tài khoản"
              aria-label="Xóa tài khoản"
            >
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white my-0 truncate">
            {account.name}
          </h3>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatVND(account.current_balance)}
          </div>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            Số dư ban đầu: {formatVND(account.initial_balance)}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => onTransferFrom(account)}
          className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <IconTransfer className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Chuyển tiền từ ví này</span>
        </button>
      </div>
    </div>
  );
}
