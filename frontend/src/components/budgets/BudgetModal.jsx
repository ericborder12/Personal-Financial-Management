import React, { useState, useEffect } from "react";
import { IconX } from "../common/Icons";

export default function BudgetModal({
  isOpen,
  onClose,
  onSave,
  categories = [],
  editingBudget = null,
  year,
  month,
}) {
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingBudget) {
      setCategoryId(editingBudget.category_id);
      setLimit(String(editingBudget.limit || ""));
    } else if (categories.length > 0) {
      setCategoryId(categories[0].id);
      setLimit("");
    }
    setError(null);
  }, [editingBudget, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId) {
      setError("Vui lòng chọn danh mục");
      return;
    }
    const numLimit = parseInt(limit.replace(/\D/g, ""), 10);
    if (isNaN(numLimit) || numLimit < 0) {
      setError("Hạn mức phải từ 0 VNĐ trở lên");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        category: categoryId,
        limit: numLimit,
        year,
        month,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Không thể lưu ngân sách");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryName =
    editingBudget?.category_name ||
    categories.find((c) => c.id === categoryId)?.name ||
    "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white my-0">
            {editingBudget?.limit > 0
              ? `Chỉnh sửa ngân sách - ${selectedCategoryName}`
              : `Thiết lập ngân sách tháng ${month}/${year}`}
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
          {!editingBudget && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Danh mục chi tiêu
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Hạn mức tối đa trong tháng (VNĐ)
            </label>
            <input
              type="text"
              required
              placeholder="VD: 3.000.000"
              value={Number(limit || 0).toLocaleString("vi-VN")}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setLimit(raw);
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-lg font-extrabold text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <span className="mt-1 block text-[11px] text-slate-400">
              Hệ thống sẽ cảnh báo màu cam khi đạt 80% và màu đỏ khi vượt quá 100%.
            </span>
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
              {submitting ? "Đang lưu..." : "Lưu hạn mức"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
