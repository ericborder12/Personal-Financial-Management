import React, { useState, useEffect } from "react";
import { IconX } from "../common/Icons";

export default function AccountModal({ isOpen, onClose, onSave, editingAccount = null }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [initialBalance, setInitialBalance] = useState("0");
  const [color, setColor] = useState("#3B82F6");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setInitialBalance(String(editingAccount.initial_balance || 0));
      setColor(editingAccount.color || "#3B82F6");
    } else {
      setName("");
      setType("bank");
      setInitialBalance("0");
      setColor("#3B82F6");
    }
    setError(null);
  }, [editingAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên tài khoản");
      return;
    }
    const balNum = parseInt(initialBalance.replace(/\D/g, ""), 10) || 0;
    setSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        type,
        initial_balance: balNum,
        color,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra khi lưu tài khoản");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white my-0">
            {editingAccount ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Tên tài khoản / Ví
            </label>
            <input
              type="text"
              required
              placeholder="VD: Vietcombank, Techcombank, Tiền mặt..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Loại tài khoản
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="bank">Ngân hàng (Bank)</option>
              <option value="cash">Tiền mặt (Cash)</option>
              <option value="ewallet">Ví điện tử (Momo, ZaloPay, ViettelMoney...)</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Số dư ban đầu (VNĐ)
            </label>
            <input
              type="text"
              value={Number(initialBalance || 0).toLocaleString("vi-VN")}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setInitialBalance(raw);
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Đang lưu..." : "Lưu tài khoản"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
