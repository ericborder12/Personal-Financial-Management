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
  IconChevronLeft,
  IconChevronRight,
  IconSparkles,
} from "../components/common/Icons";

const monthName = (year, month) =>
  new Intl.DateTimeFormat("vi-VN", { month: "long" }).format(
    new Date(year, month - 1, 1)
  );

export default function DashboardPage({ onOpenQuickTransaction, setActiveTab }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const { data, loading, error, refresh } = useFinanceDashboard(
    selectedYear,
    selectedMonth
  );

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((year) => year - 1);
    } else {
      setSelectedMonth((month) => month - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((year) => year + 1);
    } else {
      setSelectedMonth((month) => month + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-700 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">
            Đang đồng bộ dữ liệu tài chính...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center dark:border-rose-900/50 dark:bg-slate-900">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          Không thể tải dữ liệu: {error.message}
        </p>
        <button
          onClick={refresh}
          className="mt-4 cursor-pointer rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
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

  const maxTrendValue = Math.max(
    ...monthly_trend.map((item) => Math.max(item.income || 0, item.expense || 0)),
    1
  );

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#e4e9e3] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(20,40,30,0.025)] dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-[#e7ebe6] bg-[#f7f9f6] p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={handlePrevMonth}
              className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-emerald-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              title="Tháng trước"
              aria-label="Tháng trước"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[142px] px-2 text-center text-sm font-bold capitalize text-slate-800 dark:text-slate-100">
              {monthName(selectedYear, selectedMonth)} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-emerald-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              title="Tháng sau"
              aria-label="Tháng sau"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
          {!isCurrentMonth && (
            <button
              onClick={handleResetToCurrentMonth}
              className="cursor-pointer text-sm font-semibold text-emerald-800 transition-colors hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Tháng hiện tại
            </button>
          )}
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#ecfdf5] px-3 py-2 text-xs font-semibold text-[#15803d] dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
          </span>
          Dữ liệu đã đồng bộ
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#16a34a] via-[#15803d] to-[#0f766e] p-6 text-white shadow-[0_14px_32px_rgba(22,163,74,0.22)] dark:from-[#15803d] dark:to-[#115e59] sm:p-7 xl:col-span-5">
          <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -right-1 -top-11 h-48 w-48 rounded-full border border-white/15" />
          <div className="relative flex h-full min-h-[196px] flex-col justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-50">
                <IconAccounts className="h-4 w-4" />
                Tổng tài sản
              </div>
              <p className="mt-3 text-sm text-emerald-50/85">
                Số dư trên tất cả ví và tài khoản
              </p>
              <p className="mt-2 break-words text-[clamp(1.7rem,3.1vw,2.55rem)] font-extrabold leading-tight tracking-[-0.045em] tabular-nums">
                {formatVND(total_balance)}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-white/20 pt-4">
              <span className="text-xs font-medium text-emerald-50/85">
                Cập nhật theo giao dịch mới nhất
              </span>
              <button
                onClick={() => setActiveTab("accounts")}
                className="cursor-pointer text-xs font-bold text-[#dcfce7] transition-colors hover:text-white"
              >
                Xem tài khoản <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:col-span-7">
          <StatCard
            title="Thu nhập"
            amount={monthly_income}
            subtitle={monthName(selectedYear, selectedMonth)}
            icon={<IconArrowUpRight className="h-4 w-4" />}
            color="emerald"
          />
          <StatCard
            title="Chi tiêu"
            amount={monthly_expense}
            subtitle={monthName(selectedYear, selectedMonth)}
            icon={<IconArrowDownRight className="h-4 w-4" />}
            color="rose"
          />
          <StatCard
            title="Tiết kiệm ròng"
            amount={monthly_savings}
            subtitle={monthly_savings >= 0 ? "Thu lớn hơn chi" : "Chi lớn hơn thu"}
            icon={<IconSparkles className="h-4 w-4" />}
            color={monthly_savings >= 0 ? "purple" : "rose"}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="dashboard-panel xl:col-span-7">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Tiền đi đâu trong {monthName(selectedYear, selectedMonth)}</h2>
              <p>Phân bổ chi tiêu theo danh mục</p>
            </div>
            <span className="dashboard-count">{category_expenses.length} mục</span>
          </div>
          <div className="pt-5">
            <ExpenseCategoryChart
              categoryExpenses={category_expenses}
              totalExpense={monthly_expense}
            />
          </div>
        </div>

        <div className="dashboard-panel xl:col-span-5">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Ngân sách tháng</h2>
              <p>Theo dõi hạn mức của bạn</p>
            </div>
            <button
              onClick={() => setActiveTab("budgets")}
              className="cursor-pointer text-sm font-bold text-[#16a34a] transition-colors hover:text-[#15803d] dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Chi tiết <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="pt-5">
            <BudgetProgressWidget
              budgets={budget_progress}
              onManageBudgets={() => setActiveTab("budgets")}
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="dashboard-panel xl:col-span-5">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Dòng tiền 6 tháng</h2>
              <p>So sánh thu nhập và chi tiêu</p>
            </div>
          </div>
          {monthly_trend.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu dòng tiền.
            </div>
          ) : (
            <div className="pt-5">
              <div className="grid grid-cols-6 gap-2">
                {monthly_trend.map((item, index) => {
                  const incomeHeight = Math.max(
                    Math.round(((item.income || 0) / maxTrendValue) * 100),
                    item.income ? 5 : 2
                  );
                  const expenseHeight = Math.max(
                    Math.round(((item.expense || 0) / maxTrendValue) * 100),
                    item.expense ? 5 : 2
                  );
                  const isSelected =
                    item.month === selectedMonth && selectedYear === now.getFullYear();

                  return (
                    <div key={`${item.month}-${index}`} className="flex flex-col items-center gap-2">
                      <div className="flex h-32 w-full items-end justify-center gap-1.5 border-b border-[#edf0ec] pb-2 dark:border-slate-800">
                        <div
                          className="w-3 rounded-t-md bg-[#22c55e] transition-[height] duration-300 sm:w-4"
                          style={{ height: `${incomeHeight}%` }}
                          title={`Thu nhập: ${formatVND(item.income)}`}
                        />
                        <div
                          className="w-3 rounded-t-md bg-[#e9967c] transition-[height] duration-300 sm:w-4"
                          style={{ height: `${expenseHeight}%` }}
                          title={`Chi tiêu: ${formatVND(item.expense)}`}
                        />
                      </div>
                      <span
                        className={`text-xs ${isSelected ? "font-extrabold text-[#15803d] dark:text-emerald-300" : "font-medium text-slate-400"}`}
                      >
                        T{item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center gap-5 border-t border-[#edf0ec] pt-4 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#22c55e]" /> Thu nhập
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#e9967c]" /> Chi tiêu
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-panel xl:col-span-7">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Giao dịch gần đây</h2>
              <p>Những khoản thu chi mới nhất</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onOpenQuickTransaction}
                className="cursor-pointer text-sm font-bold text-[#16a34a] transition-colors hover:text-[#15803d] dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                + Thêm mới
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className="cursor-pointer text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Tất cả <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#edf0ec] dark:divide-slate-800">
            {recent_transactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Chưa có giao dịch nào
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Ghi nhận khoản thu hoặc chi đầu tiên của bạn.
                </p>
              </div>
            ) : (
              recent_transactions.slice(0, 6).map((transaction) => {
                const isIncome = transaction.type === "income";
                const isTransfer = transaction.type === "transfer";

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 py-3.5 first:pt-4 last:pb-1"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                          isIncome
                            ? "bg-[#ecfdf5] text-[#15803d] dark:bg-emerald-950/60 dark:text-emerald-300"
                            : isTransfer
                              ? "bg-[#f0eef9] text-[#6f62a8] dark:bg-violet-950/50 dark:text-violet-300"
                              : "bg-[#fbefeb] text-[#b65d43] dark:bg-rose-950/50 dark:text-rose-300"
                        }`}
                        aria-hidden="true"
                      >
                        {isIncome ? "+" : isTransfer ? "⇄" : "−"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                          {isTransfer
                            ? `${transaction.account_name} → ${transaction.to_account_name}`
                            : transaction.category_name || "Chưa phân loại"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {formatDate(transaction.date)}
                          {transaction.note ? ` · ${transaction.note}` : ""}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-right text-sm font-bold tabular-nums ${
                        isIncome
                          ? "text-[#15803d] dark:text-emerald-300"
                          : isTransfer
                            ? "text-[#6f62a8] dark:text-violet-300"
                            : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {isIncome ? "+" : isTransfer ? "" : "−"}
                      {formatVND(transaction.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
