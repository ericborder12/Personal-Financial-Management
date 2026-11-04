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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-500/20">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
            Tổng tài sản hiện có
          </span>
          <div className="mt-1 text-3xl font-extrabold tracking-tight">
            {formatVND(totalBalance)}
          </div>
          <p className="mt-1 text-xs text-blue-100/80">
            Phân bổ trên {accounts.length} tài khoản đang hoạt động
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenTransfer()}
            disabled={accounts.length < 2}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            <IconTransfer className="w-4 h-4" />
            <span>Chuyển tiền nội bộ</span>
          </button>
          <button
            onClick={() => {
              setEditingAccount(null);
              setAccountModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            <IconPlus className="w-4 h-4" />
            <span>Thêm tài khoản</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-950/40">
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
          className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-6 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-800 dark:hover:border-blue-500"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <IconPlus className="w-5 h-5" />
          </div>
          <span className="mt-3 text-xs font-bold">+ Thêm ví hoặc tài khoản ngân hàng</span>
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
