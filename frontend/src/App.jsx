import { useEffect, useState } from "react";
import { api } from "./api/client";
import Summary from "./components/Summary";
import BudgetSection from "./components/BudgetSection";
import BudgetEditor from "./components/BudgetEditor";
import TransactionForm from "./components/TransactionForm";
import ImportDialog from "./components/ImportDialog";
import { useAuth } from "./auth/useAuth";
import { useTransactions } from "./hooks/useTransactions";
import { useBudgets } from "./hooks/useBudgets";
import { useProfile } from "./hooks/useProfile";
import { hasLegacyData, readLegacy } from "./utils/legacy";
import { CATEGORIES, getIcon, formatVND, formatDate } from "./constants";

const todayStr = () => new Date().toLocaleDateString("sv-SE");
const currentMonth = () => todayStr().slice(0, 7);
const lastDateOfMonth = (month) =>
  `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}`;

export default function App() {
  const { user, logout } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [filters, setFilters] = useState({
    startDate: `${currentMonth()}-01`,
    endDate: lastDateOfMonth(currentMonth()),
    search: "",
    type: "",
    category: "",
    minAmount: "",
    maxAmount: "",
    ordering: "-date",
  });
  const [page, setPage] = useState(1);
  const { transactions, count, loading, error, addTransaction, deleteTransaction } =
    useTransactions({ ...filters, page });
  const { budgets, saveBudgets } = useBudgets();
  const { initialBalance, importedAt, loading: profileLoading, setInitialBalance } = useProfile();
  const [legacy] = useState(readLegacy);
  const [importDismissed, setImportDismissed] = useState(false);
  const [formType, setFormType] = useState(null); // null | "income" | "expense"
  const [editingBudgets, setEditingBudgets] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryVersion, setSummaryVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .transactionSummary(month)
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
          setSummaryError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setSummaryError({ month, message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [month, summaryVersion]);

  const showImport =
    !profileLoading &&
    importedAt === null &&
    !importDismissed &&
    hasLegacyData(legacy);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const spent = summary?.spent_by_category ?? {};
  const pool =
    initialBalance +
    (summary?.income_through_month ?? 0) -
    (summary?.expense_before_month ?? 0);
  const pageSize = 20;
  const pageCount = Math.ceil(count / pageSize);
  const categories = [...new Set([...CATEGORIES.income, ...CATEGORIES.expense].map((item) => item.name))];

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const handleAddTransaction = async (data) => {
    const created = await addTransaction(data);
    setSummaryVersion((version) => version + 1);
    return created;
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await deleteTransaction(id);
      setSummaryVersion((version) => version + 1);
    } catch (err) {
      window.alert(err.message);
    }
  };

  // Trả khoản cố định (vd tiền nhà): tạo giao dịch chi đúng số còn thiếu
  const handlePayFixed = async (category, amount) => {
    if (amount <= 0) return;
    const today = todayStr();
    try {
      await handleAddTransaction({
        type: "expense",
        amount,
        category,
        date: today.startsWith(month) ? today : `${month}-01`,
        note: "Chi cố định hàng tháng",
      });
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="px-4 pb-2 pt-8">
        <div className="mx-auto flex max-w-md items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-800">💸 Quản lý tài chính</h1>
            <p className="truncate text-sm text-slate-500">
              {user.display_name || user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-6 px-4 pt-4">
        <Summary
          summary={summary}
          initialBalance={initialBalance}
          onInitialBalanceChange={setInitialBalance}
          month={month}
          onMonthChange={(value) => {
            setMonth(value);
            setFilters((current) => ({
              ...current,
              startDate: `${value}-01`,
              endDate: lastDateOfMonth(value),
            }));
            setPage(1);
          }}
          onAddClick={setFormType}
        />

        <BudgetSection
          budgets={budgets}
          spent={spent}
          pool={pool}
          onEdit={() => setEditingBudgets(true)}
          onPayFixed={handlePayFixed}
        />

        <section>
          <h2 className="mb-3 font-semibold text-slate-800">Danh sách giao dịch</h2>

          <div className="mb-3 space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <input
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Tìm trong danh mục, ghi chú..."
              aria-label="Tìm kiếm giao dịch"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.type}
                onChange={(event) => updateFilter("type", event.target.value)}
                aria-label="Lọc loại giao dịch"
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
              >
                <option value="">Tất cả thu chi</option>
                <option value="income">Thu</option>
                <option value="expense">Chi</option>
              </select>
              <select
                value={filters.category}
                onChange={(event) => updateFilter("category", event.target.value)}
                aria-label="Lọc danh mục"
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-500">
                Từ ngày
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => updateFilter("startDate", event.target.value)}
                  aria-label="Ngày bắt đầu"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-700"
                />
              </label>
              <label className="text-xs text-slate-500">
                Đến ngày
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => updateFilter("endDate", event.target.value)}
                  aria-label="Ngày kết thúc"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-700"
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min="1"
                value={filters.minAmount}
                onChange={(event) => updateFilter("minAmount", event.target.value)}
                placeholder="Từ (đ)"
                aria-label="Số tiền tối thiểu"
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
              />
              <input
                type="number"
                min="1"
                value={filters.maxAmount}
                onChange={(event) => updateFilter("maxAmount", event.target.value)}
                placeholder="Đến (đ)"
                aria-label="Số tiền tối đa"
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
              />
              <select
                value={filters.ordering}
                onChange={(event) => updateFilter("ordering", event.target.value)}
                aria-label="Sắp xếp giao dịch"
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
              >
                <option value="-date">Ngày mới nhất</option>
                <option value="date">Ngày cũ nhất</option>
                <option value="-amount">Số tiền cao nhất</option>
                <option value="amount">Số tiền thấp nhất</option>
                <option value="category">Danh mục A-Z</option>
                <option value="-category">Danh mục Z-A</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {summaryError?.month === month && (
            <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Không tải được thống kê: {summaryError.message}
            </p>
          )}

          {loading ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
              Đang tải giao dịch...
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400">
              <p className="text-3xl">🗒️</p>
              <p className="mt-2 text-sm">
                {count === 0 ? "Không tìm thấy giao dịch phù hợp" : "Không có giao dịch ở trang này"}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                      t.type === "income" ? "bg-emerald-50" : "bg-rose-50"
                    }`}
                  >
                    {getIcon(t.type, t.category)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{t.category}</p>
                    <p className="truncate text-xs text-slate-500">
                      {formatDate(t.date)}
                      {t.note && ` · ${t.note}`}
                    </p>
                  </div>

                  <span className={`font-semibold ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.type === "income" ? "+" : "−"}
                    {formatVND(t.amount)}
                  </span>

                  <button
                    onClick={() => handleDeleteTransaction(t.id)}
                    className="rounded-full p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Xóa giao dịch"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && count > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>{count} giao dịch · Trang {page} / {pageCount}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="rounded-lg bg-white px-3 py-1.5 font-medium ring-1 ring-slate-200 disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-lg bg-white px-3 py-1.5 font-medium ring-1 ring-slate-200 disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {showImport && <ImportDialog onClose={() => setImportDismissed(true)} />}

      {formType && (
        <TransactionForm
          key={formType}
          type={formType}
          spentByCategory={spent}
          budgets={budgets}
          onAdd={handleAddTransaction}
          onClose={() => setFormType(null)}
        />
      )}

      {editingBudgets && (
        <BudgetEditor
          budgets={budgets}
          pool={pool}
          onSave={saveBudgets}
          onClose={() => setEditingBudgets(false)}
        />
      )}
    </div>
  );
}