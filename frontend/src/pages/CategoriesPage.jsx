import React, { useState } from "react";
import { useCategories } from "../hooks/useFinance";
import { IconPlus, IconX, IconEdit, IconTrash } from "../components/common/Icons";

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#64748B",
];

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState("expense");
  const { categories, loading, error, createCategory, updateCategory, deleteCategory } = useCategories(activeTab);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName("");
    setColor(PRESET_COLORS[0]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color || "#3B82F6");
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Vui lòng nhập tên danh mục");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: name.trim(),
          color,
          type: activeTab,
        });
      } else {
        await createCategory({
          name: name.trim(),
          color,
          type: activeTab,
        });
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Không thể lưu danh mục");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, isDefault) => {
    if (isDefault) {
      if (!window.confirm("Đây là danh mục mặc định. Bạn có chắc chắn muốn ẩn nó không?")) {
        return;
      }
    } else {
      if (!window.confirm("Bạn có chắc chắn muốn xóa danh mục này? Lịch sử giao dịch cũ vẫn sẽ được giữ lại.")) {
        return;
      }
    }
    await deleteCategory(id);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white my-0">
            Quản lý danh mục thu chi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tạo và phân loại danh mục theo nhu cầu quản lý tài chính cá nhân
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>Thêm danh mục mới</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
          {error.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("expense")}
          className={`cursor-pointer pb-3 text-xs sm:text-sm font-bold transition-all border-b-2 ${
            activeTab === "expense"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Danh mục chi tiêu ({categories.filter((c) => c.type === "expense").length})
        </button>
        <button
          onClick={() => setActiveTab("income")}
          className={`cursor-pointer pb-3 text-xs sm:text-sm font-bold transition-all border-b-2 ${
            activeTab === "income"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Danh mục thu nhập ({categories.filter((c) => c.type === "income").length})
        </button>
      </div>

      {/* Category Cards Grid */}
      {loading && categories.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="h-4 w-4 rounded-md shrink-0 shadow-2xs"
                  style={{ backgroundColor: cat.color || "#3B82F6" }}
                />
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 dark:text-white text-base truncate block">
                    {cat.name}
                  </span>
                  {cat.is_default && (
                    <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Mặc định
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  title="Chỉnh sửa danh mục"
                  aria-label="Sửa danh mục"
                >
                  <IconEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.is_default)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                  title="Xóa / Ẩn danh mục"
                  aria-label="Xóa danh mục"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white my-0">
                {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Tên danh mục
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cà phê, Xăng xe, Tiền thưởng..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Chọn màu đại diện
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`cursor-pointer h-7 w-7 rounded-lg transition-transform ${
                        color === c ? "scale-115 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900" : ""
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Màu ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="cursor-pointer rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  {submitting ? "Đang lưu..." : "Lưu danh mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
