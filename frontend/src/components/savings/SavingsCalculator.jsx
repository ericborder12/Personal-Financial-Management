import React, { useState, useMemo } from "react";
import { formatVND } from "../../constants";

export default function SavingsCalculator() {
  const [amount, setAmount] = useState(50000000);
  const [termMonths, setTermMonths] = useState(6);
  const [interestRate, setInterestRate] = useState(5.5);
  const [payoutType, setPayoutType] = useState("end_of_term");

  const PRESET_AMOUNTS = [10000000, 20000000, 50000000, 100000000, 200000000];
  const PRESET_TERMS = [1, 3, 6, 9, 12, 18, 24, 36];

  const calculation = useMemo(() => {
    const rateDecimal = (Number(interestRate) || 0) / 100;
    const principal = Number(amount) || 0;
    const months = Number(termMonths) || 1;

    const totalInterest =
      payoutType === "end_of_term"
        ? Math.round(principal * rateDecimal * (months / 12))
        : Math.round(((principal * rateDecimal) / 12) * months);

    const monthlyInterest = Math.round(totalInterest / months);
    const totalReceived = principal + totalInterest;

    // Monthly schedule breakdown
    const schedule = [];
    let accumulated = 0;
    for (let i = 1; i <= months; i++) {
      const monthEarned = Math.round((principal * rateDecimal) / 12);
      accumulated += monthEarned;
      schedule.push({
        month: i,
        interest: monthEarned,
        accumulatedInterest: accumulated,
        totalBalance: principal + (payoutType === "end_of_term" ? accumulated : 0),
      });
    }

    return {
      principal,
      totalInterest,
      monthlyInterest,
      totalReceived,
      schedule,
    };
  }, [amount, termMonths, interestRate, payoutType]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Column */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Thông số tiền gửi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhập số tiền và kỳ hạn để dự toán tiền lãi
              </p>
            </div>
            <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              Công cụ tính lãi
            </span>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Số tiền gửi (VND)
              </label>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {formatVND(amount)}
              </span>
            </div>
            <input
              type="number"
              min="1000000"
              step="1000000"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    amount === amt
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {(amt / 1000000).toFixed(0)} triệu
                </button>
              ))}
            </div>
          </div>

          {/* Term months input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Kỳ hạn gửi
              </label>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {termMonths} tháng
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="36"
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_TERMS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTermMonths(m)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    termMonths === m
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {m}T
                </button>
              ))}
            </div>
          </div>

          {/* Interest Rate input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Lãi suất (% / năm)
              </label>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {interestRate}%/năm
              </span>
            </div>
            <input
              type="number"
              min="0.1"
              max="25"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Payout Type */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Hình thức nhận lãi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayoutType("end_of_term")}
                className={`cursor-pointer rounded-xl p-3 text-left border text-xs transition-all ${
                  payoutType === "end_of_term"
                    ? "border-blue-500 bg-blue-50/50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 font-bold"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="font-semibold text-sm">Lãi cuối kỳ</div>
                <div className="text-slate-500 text-xs mt-0.5">Nhận toàn bộ gốc & lãi lúc đáo hạn</div>
              </button>
              <button
                type="button"
                onClick={() => setPayoutType("monthly")}
                className={`cursor-pointer rounded-xl p-3 text-left border text-xs transition-all ${
                  payoutType === "monthly"
                    ? "border-blue-500 bg-blue-50/50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 font-bold"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="font-semibold text-sm">Lãi hàng tháng</div>
                <div className="text-slate-500 text-xs mt-0.5">Nhận tiền lãi định kỳ từng tháng</div>
              </button>
            </div>
          </div>
        </div>

        {/* Results & Summary Column */}
        <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
                Ước tính lợi nhuận
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">
                  {formatVND(calculation.totalInterest)}
                </span>
                <span className="text-sm text-blue-200">tiền lãi</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
              <div>
                <span className="text-xs text-blue-200">Lãi trung bình mỗi tháng</span>
                <p className="text-base font-bold text-white mt-1">
                  {formatVND(calculation.monthlyInterest)}
                </p>
              </div>
              <div>
                <span className="text-xs text-blue-200">Tổng nhận khi đáo hạn (Gốc+Lãi)</span>
                <p className="text-base font-bold text-white mt-1">
                  {formatVND(calculation.totalReceived)}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs text-xs text-blue-100 flex items-center justify-between">
              <span>Hiệu suất sinh lời kỳ hạn {termMonths}T:</span>
              <span className="font-bold text-white">
                +{((calculation.totalInterest / (calculation.principal || 1)) * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Month-by-month Schedule Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Lộ trình tích lũy tiền lãi
            </h3>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {calculation.schedule.map((item) => (
                <div
                  key={item.month}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs"
                >
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Tháng {item.month}
                  </span>
                  <div className="text-right">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatVND(item.interest)}
                    </span>
                    <span className="text-slate-400 text-xs ml-2">
                      (Lũy kế: {formatVND(item.accumulatedInterest)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
