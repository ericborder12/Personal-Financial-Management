import React, { useState, useEffect, useCallback } from "react";
import { financeApi } from "../api/finance";
import { formatVND, formatDate } from "../constants";

export default function ReportsPage() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("sv-SE");
  const today = now.toLocaleDateString("sv-SE");

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [activePreset, setActivePreset] = useState("this_month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getReports(startDate, endDate);
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const setPreset = (type) => {
    setActivePreset(type);
    const cur = new Date();
    if (type === "this_month") {
      setStartDate(new Date(cur.getFullYear(), cur.getMonth(), 1).toLocaleDateString("sv-SE"));
      setEndDate(cur.toLocaleDateString("sv-SE"));
    } else if (type === "last_3_months") {
      setStartDate(new Date(cur.getFullYear(), cur.getMonth() - 2, 1).toLocaleDateString("sv-SE"));
      setEndDate(cur.toLocaleDateString("sv-SE"));
    } else if (type === "this_year") {
      setStartDate(new Date(cur.getFullYear(), 0, 1).toLocaleDateString("sv-SE"));
      setEndDate(cur.toLocaleDateString("sv-SE"));
    }
  };

  const {
    total_income = 0,
    total_expense = 0,
    net_savings = 0,
    category_breakdown = [],
    daily_trend = [],
  } = data || {};

  const expenseBreakdown = category_breakdown.filter((c) => c.type === "expense");
  const incomeBreakdown = category_breakdown.filter((c) => c.type === "income");

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Filter Bar & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">Khoảng thời gian:</span>
          <button
            onClick={() => setPreset("this_month")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activePreset === "this_month"
                ? "bg-slate-900 text-white dark:bg-blue-600 shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setPreset("last_3_months")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activePreset === "last_3_months"
                ? "bg-slate-900 text-white dark:bg-blue-600 shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            3 tháng gần nhất
          </button>
          <button
            onClick={() => setPreset("this_year")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activePreset === "this_year"
                ? "bg-slate-900 text-white dark:bg-blue-600 shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Năm nay
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setActivePreset("custom");
              setStartDate(e.target.value);
            }}
            className="rounded-xl border border-slate-200/90 px-3.5 py-2 font-semibold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <span className="text-slate-400 font-bold">đến</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setActivePreset("custom");
              setEndDate(e.target.value);
            }}
            className="rounded-xl border border-slate-200/90 px-3.5 py-2 font-semibold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
          {error.message}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tổng thu nhập
          </span>
          <div className="mt-2 text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatVND(total_income)}
          </div>
        </div>

        <div className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tổng chi tiêu
          </span>
          <div className="mt-2 text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
            -{formatVND(total_expense)}
          </div>
        </div>

        <div className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Thặng dư / Tiết kiệm ròng
          </span>
          <div
            className={`mt-2 text-3xl sm:text-4xl font-black tabular-nums ${
              net_savings >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatVND(net_savings)}
          </div>
        </div>
      </div>

      {/* Breakdown Lists: Chi tiêu & Thu nhập */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Expense Breakdown */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-3 border-b border-slate-100 dark:border-slate-800 my-0">
            Cơ cấu chi tiêu ({formatVND(total_expense)})
          </h3>
          <div className="mt-4 space-y-3">
            {expenseBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Không có dữ liệu chi tiêu trong giai đoạn này.
              </p>
            ) : (
              expenseBreakdown.map((cat) => (
                <div key={cat.category_id} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {cat.category_name}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatVND(cat.amount)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Income Breakdown */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-3 border-b border-slate-100 dark:border-slate-800 my-0">
            Nguồn thu nhập ({formatVND(total_income)})
          </h3>
          <div className="mt-4 space-y-3">
            {incomeBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Không có dữ liệu thu nhập trong giai đoạn này.
              </p>
            ) : (
              incomeBreakdown.map((cat) => (
                <div key={cat.category_id} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {cat.category_name}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatVND(cat.amount)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Daily Cashflow Trend */}
      {daily_trend.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-3 border-b border-slate-100 dark:border-slate-800 my-0">
            Chi tiết biến động dòng tiền theo ngày
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Ngày</th>
                  <th className="py-2.5 px-3 text-right">Thu nhập</th>
                  <th className="py-2.5 px-3 text-right">Chi tiêu</th>
                  <th className="py-2.5 px-3 text-right">Chênh lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {daily_trend.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {row.income > 0 ? `+${formatVND(row.income)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      {row.expense > 0 ? `-${formatVND(row.expense)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                      {formatVND(row.savings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
