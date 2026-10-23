import { useState } from "react";
import Summary from "./components/Summary";
import TransactionForm from "./components/TransactionForm";
import { useTransactions } from "./hooks/useTransactions";
import { useLocalStorage } from "./hooks/useLocalStorage";

const currentMonth = () => new Date().toLocaleDateString("sv-SE").slice(0, 7);

export default function App() {
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const [initialBalance, setInitialBalance] = useLocalStorage("finance-app:initial-balance", 0);
  const [month, setMonth] = useState(currentMonth);
  const [formType, setFormType] = useState(null); // null | "income" | "expense"

  const monthTransactions = transactions
    .filter((t) => t.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="mx-auto max-w-md space-y-6 px-4">
        <h1 className="text-2xl font-bold">Quản lý tài chính cá nhân</h1>

        <Summary
          transactions={transactions}
          initialBalance={initialBalance}
          onInitialBalanceChange={setInitialBalance}
          month={month}
          onMonthChange={setMonth}
          onAddClick={setFormType}
        />

        {formType && (
          <TransactionForm
            key={formType}
            type={formType}
            onAdd={addTransaction}
            onClose={() => setFormType(null)}
          />
        )}

        <ul className="space-y-2">
          {monthTransactions.length === 0 && (
            <li className="text-center text-gray-500">Chưa có giao dịch nào trong tháng này</li>
          )}
          {monthTransactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-lg bg-white p-3 shadow">
              <div>
                <p className="font-medium">{t.category}</p>
                <p className="text-sm text-gray-500">{t.date}{t.note && ` · ${t.note}`}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={t.type === "income" ? "text-green-600" : "text-red-600"}>
                  {t.type === "income" ? "+" : "-"}{t.amount.toLocaleString("vi-VN")}đ
                </span>
                <button onClick={() => deleteTransaction(t.id)} className="text-gray-400 hover:text-red-500">✕</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}