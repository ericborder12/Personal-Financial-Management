import React, { useState } from "react";
import TransactionFilterBar from "../components/transactions/TransactionFilterBar";
import TransactionTable from "../components/transactions/TransactionTable";
import TransactionModal from "../components/transactions/TransactionModal";
import { useTransactions, useCategories, useAccounts } from "../hooks/useFinance";
import { IconPlus } from "../components/common/Icons";

export default function TransactionsPage({ modalOpen, setModalOpen }) {
  const [filters, setFilters] = useState({
    page: 1,
    type: "",
    account: "",
    category: "",
    start_date: "",
    end_date: "",
    search: "",
  });

  const {
    transactions,
    count,
    loading,
    error,
    refresh,
    createTransaction,
    deleteTransaction,
  } = useTransactions(filters);

  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  const isModalOpen = modalOpen !== undefined ? modalOpen : internalModalOpen;
  const setIsModalOpen = setModalOpen || setInternalModalOpen;

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      type: "",
      account: "",
      category: "",
      start_date: "",
      end_date: "",
      search: "",
    });
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa giao dịch này không?")) {
      await deleteTransaction(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white my-0">
            Sổ giao dịch thu chi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tra cứu, tìm kiếm và quản lý chi tiết tất cả giao dịch trong ví và tài khoản ngân hàng
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>Thêm giao dịch</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
          {error.message}
        </div>
      )}

      {/* Filter Bar */}
      <TransactionFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        categories={categories}
        accounts={accounts}
      />

      {/* Transactions Table */}
      <TransactionTable
        transactions={transactions}
        loading={loading}
        onDelete={handleDelete}
        page={filters.page || 1}
        pageSize={20}
        totalCount={count}
        onPageChange={handlePageChange}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => {
          await createTransaction(data);
          refresh();
        }}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
