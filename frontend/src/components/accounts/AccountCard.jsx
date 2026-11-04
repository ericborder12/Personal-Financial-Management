import React from "react";
import { formatVND } from "../../constants";
import { IconTransfer } from "../common/Icons";

const TYPE_LABELS = {
  cash: { label: "Tiền mặt", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  bank: { label: "Ngân hàng", bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  ewallet: { label: "Ví điện tử", bg: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
  other: { label: "Khác", bg: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
};

export default function AccountCard({ account, onEdit, onDelete, onTransferFrom }) {
  const typeConfig = TYPE_LABELS[account.type] || TYPE_LABELS.other;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        <div className="flex items-center justify-between">
          <span
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${typeConfig.bg}`}
          >
            {typeConfig.label}
          </span>
          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => onEdit(account)}
              className="p-1 hover:text-slate-600 dark:hover:text-slate-200"
              title="Chỉnh sửa tài khoản"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="p-1 hover:text-rose-600 dark:hover:text-rose-400"
              title="Lưu trữ / Ẩn tài khoản"
            >
              🗑️
            </button>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white my-0">
            {account.name}
          </h3>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {formatVND(account.current_balance)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Số dư ban đầu: {formatVND(account.initial_balance)}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => onTransferFrom(account)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <IconTransfer className="w-3.5 h-3.5" />
          <span>Chuyển tiền từ ví này</span>
        </button>
      </div>
    </div>
  );
}
