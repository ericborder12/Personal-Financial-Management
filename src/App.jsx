import TransactionForm from "./components/TransactionForm";
import { useTransactions } from "./hooks/useTransactions";

export default function App() {
  const { transactions, addTransaction, deleteTransaction } = useTransactions();

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="mx-auto max-w-md space-y-6 px-4">
        <h1 className="text-2xl font-bold">Quản lý tài chính cá nhân</h1>

        <TransactionForm onAdd={addTransaction} />

        <ul className="space-y-2">
          {transactions.map((t) => (
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