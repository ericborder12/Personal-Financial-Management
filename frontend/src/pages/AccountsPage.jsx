import React, { useState } from "react";
import AccountCard from "../components/accounts/AccountCard";
import AccountModal from "../components/accounts/AccountModal";
import TransferModal from "../components/accounts/TransferModal";
import { useAccounts } from "../hooks/useFinance";
import { financeApi } from "../api/finance";
import { formatVND } from "../constants";
import { IconPlus, IconTransfer } from "../components/common/Icons";

export default function AccountsPage() {
  const { accounts, loading, error, refresh, createAccount, updateAccount, deleteAccount } = useAccounts();
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSource, setTransferSource] = useState(null);

  const totalBalance = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0);

  const handleSaveAccount = async (data) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data);
    } else {
      await createAccount(data);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn ẩn / xóa tài khoản này không? Lịch sử giao dịch cũ vẫn được bảo lưu.")) {
      await deleteAccount(id);
    }
  };

  const handleOpenTransfer = (source = null) => {
    setTransferSource(source);
    setTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (transferPayload) => {
    await financeApi.createTransaction(transferPayload);
    await refresh();
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-6 text-white shadow-md shadow-blue-500/15">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
            Tổng tài sản khả dụng
          </span>
          <div className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
            {formatVND(totalBalance)}
          </div>
          <p className="mt-1.5 text-xs text-blue-100/90 font-medium">
            Phân bổ trên {accounts.length} ví & tài khoản ngân hàng đang quản lý
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenTransfer()}
            disabled={accounts.length < 2}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition-all hover:bg-white/25 active:scale-[0.98] disabled:opacity-40"
          >
            <IconTransfer className="w-4 h-4" />
            <span>Chuyển tiền nội bộ</span>
          </button>
          <button
            onClick={() => {
              setEditingAccount(null);
              setAccountModalOpen(true);
            }}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50 active:scale-[0.98] transition-all"
          >
            <IconPlus className="w-4 h-4" />
            <span>Thêm tài khoản</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
          {error.message}
        </div>
      )}

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => (
          <AccountCard
            key={acc.id}
            account={acc}
            onEdit={(account) => {
              setEditingAccount(account);
              setAccountModalOpen(true);
            }}
            onDelete={handleDelete}
            onTransferFrom={handleOpenTransfer}
          />
        ))}

        {/* Add Account Card Button */}
        <button
          onClick={() => {
            setEditingAccount(null);
            setAccountModalOpen(true);
          }}
          className="group cursor-pointer flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-6 text-slate-400 transition-all hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/20 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/20"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 dark:group-hover:bg-blue-950/60 dark:group-hover:text-blue-400 transition-colors">
            <IconPlus className="w-5 h-5" />
          </div>
          <span className="mt-3 text-xs font-bold">+ Thêm ví hoặc tài khoản mới</span>
        </button>
      </div>

      {/* Account Create/Edit Modal */}
      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onSave={handleSaveAccount}
        editingAccount={editingAccount}
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        accounts={accounts}
        defaultSourceAccount={transferSource}
        onTransferSuccess={handleExecuteTransfer}
      />
    </div>
  );
}
