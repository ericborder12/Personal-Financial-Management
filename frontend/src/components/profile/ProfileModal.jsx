import React, { useState } from "react";
import { api } from "../../api/client";
import { formatDate } from "../../constants";
import {
  IconX,
  IconUser,
  IconShield,
  IconKey,
  IconCheck,
  IconLock,
  IconSun,
  IconMoon,
} from "../common/Icons";

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  onProfileUpdated,
  darkMode,
  setDarkMode,
}) {
  const [activeTab, setActiveTab] = useState("general"); // "general" | "password" | "preferences"
  
  // General Info state
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [updatingName, setUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState(null);

  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  if (!isOpen) return null;

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setUpdatingName(true);
    setNameError(null);
    setNameSuccess(false);

    try {
      const updated = await api.updateMe({ display_name: displayName.trim() });
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(err.message || "Không thể cập nhật tên hiển thị");
    } finally {
      setUpdatingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!oldPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!newPassword) {
      setPasswordError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có tối thiểu 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      const msg =
        err.data?.old_password?.[0] ||
        err.data?.new_password?.[0] ||
        err.message ||
        "Không thể đổi mật khẩu.";
      setPasswordError(msg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const userInitial = (displayName || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <IconUser className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white my-0">
                Hồ sơ tài khoản & Cài đặt
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quản lý thông tin cá nhân, bảo mật mật khẩu và giao diện
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Đóng cửa sổ"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={() => setActiveTab("general")}
            className={`cursor-pointer flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === "general"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <IconUser className="w-4 h-4" />
            <span>Thông tin cá nhân</span>
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`cursor-pointer flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === "password"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <IconShield className="w-4 h-4" />
            <span>Đổi mật khẩu</span>
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`cursor-pointer flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === "preferences"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <IconSun className="w-4 h-4" />
            <span>Giao diện & Cài đặt</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* TAB 1: GENERAL INFO */}
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* User Avatar Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-md shadow-blue-500/20 shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                      {displayName || "Chưa đặt tên"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                      <IconCheck className="w-3 h-3" />
                      Đã xác thực
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user?.email}
                  </p>
                  {user?.date_joined && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Thành viên từ: {formatDate(user.date_joined)}
                    </p>
                  )}
                </div>
              </div>

              {/* Form Update Name */}
              <form onSubmit={handleUpdateName} className="space-y-4">
                {nameSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs sm:text-sm font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
                    <IconCheck className="w-4 h-4 shrink-0" />
                    <span>Cập nhật tên hiển thị thành công!</span>
                  </div>
                )}

                {nameError && (
                  <div className="rounded-xl bg-rose-50 p-3.5 text-xs sm:text-sm font-semibold text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                    {nameError}
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên hiển thị (Display Name)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A..."
                    maxLength={100}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Tên này sẽ hiển thị trên góc bảng điều khiển và lời chào cá nhân.
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Địa chỉ Email (Đăng nhập)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ""}
                      readOnly
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 cursor-not-allowed"
                    />
                    <IconLock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Email là mã định danh tài khoản và không thể tự ý thay đổi.
                  </span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={updatingName}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all"
                  >
                    {updatingName ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs sm:text-sm font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
                  <IconCheck className="w-4 h-4 shrink-0" />
                  <span>Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.</span>
                </div>
              )}

              {passwordError && (
                <div className="rounded-xl bg-rose-50 p-3.5 text-xs sm:text-sm font-semibold text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu đang dùng..."
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự..."
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                <span className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Lưu ý bảo mật:
                </span>
                • Mật khẩu nên có độ dài từ 8 ký tự trở lên.<br />
                • Tránh sử dụng thông tin cá nhân dễ đoán hoặc mật khẩu thông dụng.
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  <IconKey className="w-4 h-4" />
                  <span>{updatingPassword ? "Đang xử lý..." : "Cập nhật mật khẩu"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                  Chế độ giao diện (Appearance)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setDarkMode(false)}
                    className={`cursor-pointer flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      !darkMode
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold shadow-xs"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-xs border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                      <IconSun className="w-6 h-6 text-amber-500" />
                    </div>
                    <span className="text-sm font-bold">Giao diện Sáng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDarkMode(true)}
                    className={`cursor-pointer flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      darkMode
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold shadow-xs"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 shadow-xs border border-slate-700 text-white">
                      <IconMoon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span className="text-sm font-bold">Giao diện Tối</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Đơn vị tiền tệ chính
                </label>
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">VND (₫)</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">— Đồng Việt Nam</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                    Mặc định
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <span className="text-xs text-slate-400">
            Hệ thống quản lý tài chính FinanceFlow
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
