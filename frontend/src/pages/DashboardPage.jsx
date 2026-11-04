import React, { useState } from "react";
import StatCard from "../components/dashboard/StatCard";
import ExpenseCategoryChart from "../components/dashboard/ExpenseCategoryChart";
import BudgetProgressWidget from "../components/dashboard/BudgetProgressWidget";
import { useFinanceDashboard } from "../hooks/useFinance";
import { formatVND, formatDate } from "../constants";
import {
  IconAccounts,
  IconArrowUpRight,
  IconArrowDownRight,
  IconPlus,
} from "../components/common/Icons";

export default function DashboardPage({ onOpenQuickTransaction, setActiveTab }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data, loading, error, refresh } = useFinanceDashboard(selectedYear, selectedMonth);

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

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Đang tải dữ liệu tổng quan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          Không thể tải dữ liệu: {error.message}
        </p>
        <button
          onClick={refresh}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const {
    total_balance = 0,
    monthly_income = 0,
    monthly_expense = 0,
    monthly_savings = 0,
    monthly_trend = [],
    category_expenses = [],
    recent_transactions = [],
    budget_progress = [],
  } = data || {};

  return (
    <div className="space-y-6">
      {/* Month Picker / Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Tháng trước"
          >
            ←
          </button>
          <span className="font-bold text-slate-900 dark:text-white min-w-[130px] text-center">
            Tháng {selectedMonth} / {selectedYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Tháng sau"
          >
            →
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenQuickTransaction}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <IconPlus className="w-4 h-4" />
            <span>Thêm giao dịch</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng tài sản"
          amount={total_balance}
          subtitle="Tất cả tài khoản"
          icon={<IconAccounts className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Thu nhập tháng"
          amount={monthly_income}
          subtitle={`Tháng ${selectedMonth}/${selectedYear}`}
          icon={<IconArrowUpRight className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Chi tiêu tháng"
          amount={monthly_expense}
          subtitle={`Tháng ${selectedMonth}/${selectedYear}`}
          icon={<IconArrowDownRight className="w-5 h-5" />}
          color="rose"
        />
        <StatCard
          title="Tiết kiệm / Chênh lệch"
          amount={monthly_savings}
          subtitle={monthly_savings >= 0 ? "Dư dả tháng này" : "Bị âm tháng này"}
          icon={<span className="font-bold text-base">±</span>}
          color={monthly_savings >= 0 ? "purple" : "rose"}
        />
      </div>

      {/* Main Grid: Charts & Widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (7 cols): Category Breakdown & 6-month Trend */}
        <div className="space-y-6 lg:col-span-7">
          {/* Category Breakdown */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Phân bổ chi tiêu tháng {selectedMonth}
              </h2>
              <span className="text-xs font-medium text-slate-400">
                {category_expenses.length} danh mục
              </span>
            </div>
            <div className="pt-4">
              <ExpenseCategoryChart
                categoryExpenses={category_expenses}
                totalExpense={monthly_expense}
              />
            </div>
          </div>

          {/* 6-Month Trend Overview */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Xu hướng thu chi 6 tháng gần nhất
              </h2>
            </div>
            <div className="pt-4">
              <div className="grid grid-cols-6 gap-2">
                {monthly_trend.map((m, idx) => {
                  const maxVal = Math.max(
                    ...monthly_trend.map((t) => Math.max(t.income, t.expense)),
                    1
                  );
                  const incomeH = Math.round((m.income / maxVal) * 80);
                  const expenseH = Math.round((m.expense / maxVal) * 80);

                  return (
                    <div key={idx} className="flex flex-col items-center text-center">
                      <div className="flex h-24 w-full items-end justify-center gap-1.5 pb-2">
                        <div
                          className="w-2.5 rounded-t-sm bg-emerald-500 transition-all duration-300 hover:opacity-80"
                          style={{ height: `${Math.max(incomeH, 4)}px` }}
                          title={`Thu: ${formatVND(m.income)}`}
                        />
                        <div
                          className="w-2.5 rounded-t-sm bg-rose-500 transition-all duration-300 hover:opacity-80"
                          style={{ height: `${Math.max(expenseH, 4)}px` }}
                          title={`Chi: ${formatVND(m.expense)}`}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        T{m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" /> Thu nhập
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" /> Chi tiêu
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Budget Progress & Recent Transactions */}
        <div className="space-y-6 lg:col-span-5">
          {/* Budget Progress */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Hạn mức ngân sách tháng {selectedMonth}
              </h2>
              <button
                onClick={() => setActiveTab("budgets")}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Chi tiết →
              </button>
            </div>
            <div className="pt-4">
              <BudgetProgressWidget
                budgets={budget_progress}
                onManageBudgets={() => setActiveTab("budgets")}
              />
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Giao dịch gần đây
              </h2>
              <button
                onClick={() => setActiveTab("transactions")}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Xem tất cả →
              </button>
            </div>
            <div className="pt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recent_transactions.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Chưa có giao dịch nào được ghi nhận.
                </p>
              ) : (
                recent_transactions.slice(0, 6).map((tx) => {
                  const isIncome = tx.type === "income";
                  const isTransfer = tx.type === "transfer";

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold shrink-0 ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                              : isTransfer
                              ? "bg-purple-50 text-purple-600 dark:bg-purple-950/40"
                              : "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                          }`}
                        >
                          {isIncome ? "+" : isTransfer ? "⇄" : "-"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {isTransfer
                              ? `${tx.account_name} → ${tx.to_account_name}`
                              : tx.category_name || "Khác"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatDate(tx.date)} {tx.note ? `• ${tx.note}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`font-bold ${
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
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
