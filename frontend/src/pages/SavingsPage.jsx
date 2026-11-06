import React, { useState, useEffect, useCallback } from "react";
import { financeApi } from "../api/finance";
import { useAccounts } from "../hooks/useFinance";
import { formatVND, formatDate } from "../constants";
import { IconVault, IconSparkles } from "../components/common/Icons";
import SavingsCalculator from "../components/savings/SavingsCalculator";
import SavingsModal from "../components/savings/SavingsModal";
import SettleModal from "../components/savings/SettleModal";

export default function SavingsPage() {
  const [activeTab, setActiveTab] = useState("list"); // "list" | "calculator"
  const [filterStatus, setFilterStatus] = useState("active"); // "all" | "active" | "settled"
  const [deposits, setDeposits] = useState([]);
  const [summary, setSummary] = useState({
    total_deposit: 0,
    total_estimated_interest: 0,
    active_count: 0,
    maturing_soon_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);

  const { accounts, refresh: refreshAccounts } = useAccounts();

  const fetchSavings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getSavings();
      setDeposits(res.results || []);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      setError(err.message || "Không thể tải danh sách sổ tiết kiệm.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavings();
  }, [fetchSavings]);

  const handleCreateSaving = async (payload) => {
    await financeApi.createSaving(payload);
    await fetchSavings();
    await refreshAccounts();
  };

  const handleSettleSaving = async (id, payload) => {
    await financeApi.settleSaving(id, payload);
    await fetchSavings();
    await refreshAccounts();
  };

  const handleDeleteSaving = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sổ tiết kiệm này?")) return;
    try {
      await financeApi.deleteSaving(id);
      await fetchSavings();
      await refreshAccounts();
    } catch (err) {
      window.alert(err.message || "Không thể xóa sổ tiết kiệm.");
    }
  };

  const filteredDeposits = deposits.filter((d) => {
    if (filterStatus === "active") return !d.is_settled;
    if (filterStatus === "settled") return d.is_settled;
    return true;
  });

  const getDaysLeft = (maturityDateStr) => {
    if (!maturityDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maturity = new Date(maturityDateStr);
    const diffTime = maturity - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <IconVault className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Sổ tiết kiệm & Tiền gửi ngân hàng
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Theo dõi các khoản tiền gửi sinh lời có kỳ hạn và tính toán lãi suất
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-98"
        >
          <span>+ Mở sổ tiết kiệm mới</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Savings */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Tổng tiền đang gửi
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {formatVND(summary.total_deposit)}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            {summary.active_count} sổ đang hoạt động
          </span>
        </div>

        {/* Total Estimated Interest */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Tiền lãi dự tính
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            +{formatVND(summary.total_estimated_interest)}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Dự kiến nhận lúc đáo hạn
          </span>
        </div>

        {/* Active Accounts Count */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Số lượng sổ gửi
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {deposits.length}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            {summary.active_count} đang gửi • {deposits.length - summary.active_count} đã tất toán
          </span>
        </div>

        {/* Maturing Soon */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Sắp đến ngày đáo hạn
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
            {summary.maturing_soon_count} sổ
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Trong vòng 30 ngày tới
          </span>
        </div>
      </div>

      {/* Segmented Control: List vs Calculator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "list"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Danh sách sổ tiết kiệm ({deposits.length})
          </button>
          <button
            onClick={() => setActiveTab("calculator")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "calculator"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            <IconSparkles className="w-4 h-4 text-amber-500" />
            <span>Máy tính lãi suất nhanh</span>
          </button>
        </div>

        {activeTab === "list" && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl dark:bg-slate-800 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setFilterStatus("active")}
              className={`cursor-pointer px-3 py-1 rounded-lg transition-colors ${
                filterStatus === "active"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Đang gửi ({summary.active_count})
            </button>
            <button
              onClick={() => setFilterStatus("settled")}
              className={`cursor-pointer px-3 py-1 rounded-lg transition-colors ${
                filterStatus === "settled"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Đã tất toán ({deposits.length - summary.active_count})
            </button>
            <button
              onClick={() => setFilterStatus("all")}
              className={`cursor-pointer px-3 py-1 rounded-lg transition-colors ${
                filterStatus === "all"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Tất cả ({deposits.length})
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === "calculator" ? (
        <SavingsCalculator />
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Đang tải danh sách sổ tiết kiệm...
            </div>
          ) : filteredDeposits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <IconVault className="w-7 h-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-200">
                Chưa có sổ tiết kiệm nào
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Bắt đầu theo dõi các khoản tiền gửi ngân hàng để tối ưu hóa dòng tiền và lợi nhuận tích lũy.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
              >
                + Mở sổ tiết kiệm đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDeposits.map((item) => {
                const daysLeft = getDaysLeft(item.maturity_date);
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs transition-all flex flex-col justify-between dark:bg-slate-900 ${
                      item.is_settled
                        ? "border-slate-200/60 opacity-75 dark:border-slate-800"
                        : "border-slate-200/90 hover:border-blue-400 dark:border-slate-800 dark:hover:border-blue-700"
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.bank_name}
                          </span>
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                            {formatVND(item.amount)}
                          </h3>
                        </div>

                        {/* Status badge */}
                        {item.is_settled ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Đã tất toán
                          </span>
                        ) : daysLeft !== null && daysLeft <= 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse">
                            Đến hạn rút
                          </span>
                        ) : daysLeft !== null && daysLeft <= 30 ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            Còn {daysLeft} ngày
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                            Đang gửi ({daysLeft} ngày)
                          </span>
                        )}
                      </div>

                      {/* Detail metrics */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block">Kỳ hạn</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.term_months} tháng
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Lãi suất</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {item.interest_rate}%/năm
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Ngày gửi</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatDate(item.start_date)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Đáo hạn</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatDate(item.maturity_date)}
                          </span>
                        </div>
                      </div>

                      {/* Interest badge */}
                      <div className="mt-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          {item.is_settled ? "Lãi thực nhận:" : "Lãi dự tính:"}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatVND(item.is_settled ? item.actual_interest : item.estimated_interest)}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="mt-2 text-xs text-slate-500 italic line-clamp-1">
                          "{item.notes}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <button
                        onClick={() => handleDeleteSaving(item.id)}
                        className="cursor-pointer text-xs font-medium text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        Xóa sổ
                      </button>

                      {!item.is_settled && (
                        <button
                          onClick={() => {
                            setSelectedDeposit(item);
                            setSettleModalOpen(true);
                          }}
                          className="cursor-pointer rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                        >
                          Tất toán sổ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <SavingsModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateSaving}
        accounts={accounts}
      />

      <SettleModal
        isOpen={settleModalOpen}
        onClose={() => {
          setSettleModalOpen(false);
          setSelectedDeposit(null);
        }}
        onSettle={handleSettleSaving}
        deposit={selectedDeposit}
        accounts={accounts}
      />
    </div>
  );
}
