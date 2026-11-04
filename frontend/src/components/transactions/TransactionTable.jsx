import React from "react";
import { formatVND, formatDate } from "../../constants";
import { IconTrash, IconChevronLeft, IconChevronRight, IconTransactions } from "../common/Icons";

export default function TransactionTable({
  transactions = [],
  loading = false,
  onDelete,
  page = 1,
  pageSize = 20,
  totalCount = 0,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (loading && transactions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
          <IconTransactions className="w-5 h-5" />
        </div>
        <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
          Không tìm thấy giao dịch nào phù hợp
        </p>
        <span className="mt-1 text-[11px] text-slate-400 max-w-xs">
          Hãy thử điều chỉnh bộ lọc tìm kiếm hoặc tạo thêm giao dịch mới.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="py-3.5 pl-6 pr-3">Ngày</th>
              <th className="px-3 py-3.5">Phân loại & Danh mục</th>
              <th className="px-3 py-3.5">Tài khoản</th>
              <th className="px-3 py-3.5">Ghi chú</th>
              <th className="px-3 py-3.5 text-right">Số tiền</th>
              <th className="py-3.5 pl-3 pr-6 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.map((tx) => {
              const isIncome = tx.type === "income";
              const isTransfer = tx.type === "transfer";

              return (
                <tr
                  key={tx.id}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  {/* Date */}
                  <td className="py-3.5 pl-6 pr-3 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatDate(tx.date)}
                  </td>

                  {/* Category & Badge */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"
                            : isTransfer
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40"
                        }`}
                      >
                        {isIncome ? "Thu nhập" : isTransfer ? "Chuyển tiền" : "Chi tiêu"}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {isTransfer
                          ? "Nội bộ"
                          : tx.category_name || "Chưa phân loại"}
                      </span>
                    </div>
                  </td>

                  {/* Account */}
                  <td className="px-3 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {isTransfer ? (
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {tx.account_name} → {tx.to_account_name}
                      </span>
                    ) : (
                      <span className="font-medium">{tx.account_name}</span>
                    )}
                  </td>

                  {/* Note */}
                  <td className="px-3 py-3.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {tx.note || "—"}
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-3.5 whitespace-nowrap text-right tabular-nums">
                    <span
                      className={`text-sm font-extrabold ${
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isTransfer
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isIncome ? "+" : isTransfer ? "" : "-"}
                      {formatVND(tx.amount)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                      title="Xóa giao dịch này"
                      aria-label="Xóa giao dịch"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-xs text-slate-500 dark:border-slate-800">
          <span className="tabular-nums font-medium">
            Trang {page} / {totalPages} (Tổng cộng {totalCount} giao dịch)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="cursor-pointer inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
            >
              <IconChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="cursor-pointer inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Sau</span>
              <IconChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
