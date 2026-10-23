import { useState } from "react";

const EXPENSE_CATEGORIES = ["Ăn uống", "Di chuyển", "Nhà ở", "Mua sắm", "Giải trí", "Học tập", "Khác"];
const INCOME_CATEGORIES = ["Lương", "Thưởng", "Làm thêm", "Khác"];

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ onAdd }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(newType === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) return;

    onAdd({ type, amount: value, category, date, note: note.trim() });
    setAmount("");
    setNote("");
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow">
      <h2 className="text-lg font-semibold">Thêm giao dịch</h2>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleTypeChange("expense")}
          className={`rounded-lg py-2 font-medium ${
            type === "expense" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          Chi tiêu
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("income")}
          className={`rounded-lg py-2 font-medium ${
            type === "income" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          Thu nhập
        </button>
      </div>

      <input
        type="number"
        min="1"
        step="1"
        placeholder="Số tiền (VND)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className={inputClass}
        required
      />

      <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />

      <input
        type="text"
        placeholder="Ghi chú (không bắt buộc)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={inputClass}
      />

      <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700">
        Thêm
      </button>
    </form>
  );
}