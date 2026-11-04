import React, { useState } from "react";
import BudgetCard from "../components/budgets/BudgetCard";
import BudgetModal from "../components/budgets/BudgetModal";
import { useBudgets, useCategories } from "../hooks/useFinance";
import { formatVND } from "../constants";
import { IconPlus } from "../components/common/Icons";

export default function BudgetsPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const { budgets, loading, error, setBudget, deleteBudget } = useBudgets(
    selectedYear,
    selectedMonth
  );
  const { categories } = useCategories("expense");

  const totalLimit = budgets.reduce((acc, b) => acc + (b.limit || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
  const totalRemaining = Math.max(0, totalLimit - totalSpent);
  const overallPercentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleSaveBudget = async (payload) => {
    await setBudget(payload);
  };

  const handleDeleteBudget = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa hạn mức này?")) {
      await deleteBudget(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Month Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white my-0">
            Quản lý ngân sách chi tiêu
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Đặt giới hạn chi tiêu theo danh mục để kiểm soát tài chính cá nhân hiệu quả
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ←
            </button>
            <span className="px-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              T{selectedMonth}/{selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              →
            </button>
          </div>

          <button
            onClick={() => {
              setEditingBudget(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <IconPlus className="w-4 h-4" />
            <span>Thiết lập ngân sách</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-950/40">
          {error.message}
        </div>
      )}

      {/* Overview Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tổng ngân sách tháng
            </span>
            <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatVND(totalLimit)}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Đã chi tiêu
            </span>
            <div className="mt-1 text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {formatVND(totalSpent)}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Còn lại
            </span>
            <div className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatVND(totalRemaining)}
            </div>
          </div>
        </div>

        {totalLimit > 0 && (
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Tiến độ chi tiêu tổng quát</span>
              <span
                className={
                  overallPercentage >= 100
                    ? "text-rose-600 font-bold"
                    : overallPercentage >= 80
                    ? "text-amber-600 font-bold"
                    : "text-emerald-600 font-bold"
                }
              >
                {overallPercentage}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallPercentage >= 100
                    ? "bg-rose-500"
                    : overallPercentage >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Budgets Cards Grid */}
      {loading && budgets.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => (
            <BudgetCard
              key={b.category_id || b.id}
              budget={b}
              onEdit={(budget) => {
                setEditingBudget(budget);
                setModalOpen(true);
              }}
              onDelete={handleDeleteBudget}
            />
          ))}
        </div>
      )}

      {/* Budget Modal */}
      <BudgetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveBudget}
        categories={categories}
        editingBudget={editingBudget}
        year={selectedYear}
        month={selectedMonth}
      />
    </div>
  );
}
