export const CATEGORIES = {
  expense: [
    { name: "Ăn uống", icon: "🍜" },
    { name: "Di chuyển", icon: "🛵" },
    { name: "Nhà ở", icon: "🏠" },
    { name: "Mua sắm", icon: "🛍️" },
    { name: "Giải trí", icon: "🎮" },
    { name: "Học tập", icon: "📚" },
    { name: "Khác", icon: "📦" },
  ],
  income: [
    { name: "Lương", icon: "💼" },
    { name: "Thưởng", icon: "🎁" },
    { name: "Làm thêm", icon: "💻" },
    { name: "Khác", icon: "💰" },
  ],
};

export const getIcon = (type, name) =>
  CATEGORIES[type]?.find((c) => c.name === name)?.icon ?? "💰";

export const formatVND = (n) => n.toLocaleString("vi-VN") + "đ";

export const formatDate = (iso) => iso.split("-").reverse().join("/");