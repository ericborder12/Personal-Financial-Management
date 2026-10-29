import { useState } from "react";
import Summary from "./components/Summary";
import BudgetSection from "./components/BudgetSection";
import BudgetEditor from "./components/BudgetEditor";
import TransactionForm from "./components/TransactionForm";
import { useTransactions } from "./hooks/useTransactions";
import { useBudgets } from "./hooks/useBudgets";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { getSpentByCategory, getMonthPool } from "./utils/budget";
import { getIcon, formatVND, formatDate } from "./constants";

const todayStr = () => new Date().toLocaleDateString("sv-SE");
const currentMonth = () => todayStr().slice(0, 7);

export default function App() {
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const { budgets, setBudgets } = useBudgets();
  const [initialBalance, setInitialBalance] = useLocalStorage("finance-app:initial-balance", 0);
  const [month, setMonth] = useState(currentMonth);
  const [formType, setFormType] = useState(null); // null | "income" | "expense"
  const [editingBudgets, setEditingBudgets] = useState(false);

  const spent = getSpentByCategory(transactions, month);
  const pool = getMonthPool(transactions, initialBalance, month);

  const monthTransactions = transactions
    .filter((t) => t.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Trả khoản cố định (vd tiền nhà): tạo giao dịch chi đúng số còn thiếu
  const handlePayFixed = (category, amount) => {
    if (amount <= 0) return;
    const today = todayStr();
    addTransaction({
      type: "expense",
      amount,
      category,
      date: today.startsWith(month) ? today : `${month}-01`,
      note: "Chi cố định hàng tháng",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="px-4 pb-2 pt-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800">💸 Quản lý tài chính</h1>
        <p className="text-sm text-slate-500">Theo dõi thu chi cá nhân</p>
      </header>

      <main className="mx-auto max-w-md space-y-6 px-4 pt-4">
        <Summary
          transactions={transactions}
          initialBalance={initialBalance}
          onInitialBalanceChange={setInitialBalance}
          month={month}
          onMonthChange={setMonth}
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
          <h2 className="mb-3 font-semibold text-slate-800">Giao dịch trong tháng</h2>

          {monthTransactions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400">
              <p className="text-3xl">🗒️</p>
              <p className="mt-2 text-sm">Chưa có giao dịch nào trong tháng này</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {monthTransactions.map((t) => (
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
                    onClick={() => deleteTransaction(t.id)}
                    className="rounded-full p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Xóa giao dịch"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {formType && (
        <TransactionForm
          key={formType}
          type={formType}
          transactions={transactions}
          budgets={budgets}
          onAdd={addTransaction}
          onClose={() => setFormType(null)}
        />
      )}

      {editingBudgets && (
        <BudgetEditor
          budgets={budgets}
          pool={pool}
          onSave={setBudgets}
          onClose={() => setEditingBudgets(false)}
        />
      )}
    </div>
  );
}