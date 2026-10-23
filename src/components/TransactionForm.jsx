import { useState } from "react";

const CATEGORIES = {
  expense: ["Ăn uống", "Di chuyển", "Nhà ở", "Mua sắm", "Giải trí", "Học tập", "Khác"],
  income: ["Lương", "Thưởng", "Làm thêm", "Khác"],
};

// Ngày theo giờ máy (toISOString dùng giờ UTC nên có thể lệch ngày)
const today = () => new Date().toLocaleDateString("sv-SE");

export default function TransactionForm({ type, onAdd, onClose }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[type][0]);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  const isIncome = type === "income";

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) return;
    onAdd({ type, amount: value, category, date, note: note.trim() });
    onClose();
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-semibold ${isIncome ? "text-green-600" : "text-red-600"}`}>
          {isIncome ? "+ Thêm khoản thu" : "− Thêm khoản chi"}
        </h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
      </div>

      <input
        type="number"
        min="1"
        step="1"
        placeholder="Số tiền (VND)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className={inputClass}
        autoFocus
        required
      />

      <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
        {CATEGORIES[type].map((c) => (
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

      <button
        type="submit"
        className={`w-full rounded-lg py-2 font-medium text-white ${
          isIncome ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        Lưu
      </button>
    </form>
  );
}