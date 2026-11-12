import { useEffect, useState } from "react";
import { api } from "../api/client";
import { errorMessage } from "../api/errors";
import { useAuth } from "../auth/useAuth";
import {
  IconSun,
  IconMoon,
  IconEye,
  IconEyeOff,
  IconLock,
  IconShield,
  IconSparkles,
  IconWallet,
  IconCheck,
} from "../components/common/Icons";

const query = new URLSearchParams(window.location.search);
const emailToken = { uid: query.get("uid") || "", token: query.get("token") || "" };

export default function LoginPage() {
  const { login, register } = useAuth();
  const [flow, setFlow] = useState(() =>
    query.has("verify") ? "verifying" : query.has("reset") ? "reset" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Synchronize Dark Mode toggle with global document class
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    if (flow !== "verifying") return;
    let cancelled = false;
    api
      .verifyEmail(emailToken)
      .then((result) => {
        if (!cancelled) {
          setNotice(result.detail);
          setFlow("verified");
          window.history.replaceState({}, "", window.location.pathname);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(errorMessage(err));
          setFlow("verify-error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [flow]);

  const switchFlow = (next) => {
    setFlow(next);
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      if (flow === "login") {
        await login(email.trim(), password, rememberMe);
      } else if (flow === "register") {
        const result = await register(email.trim(), password, displayName.trim());
        setNotice(result.detail || "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.");
      } else if (flow === "forgot") {
        const result = await api.requestPasswordReset({ email: email.trim() });
        setNotice(result.detail || "Đã gửi liên kết khôi phục mật khẩu vào hòm thư.");
      } else if (flow === "reset") {
        if (password !== passwordConfirm) {
          throw new Error("Mật khẩu xác nhận không khớp.");
        }
        const result = await api.confirmPasswordReset({
          ...emailToken,
          password,
        });
        setNotice(result.detail || "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.");
        setFlow("login");
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email của bạn để gửi lại liên kết.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.resendVerificationEmail({ email: email.trim() });
      setNotice(result.detail || "Đã gửi lại liên kết xác thực.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isForm = ["login", "register", "forgot", "reset"].includes(flow);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* ========================================================= */}
      {/* CỘT TRÁI: FORM AUTHENTICATION (45% - 48% trên màn lớn)    */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 relative z-10 bg-white/95 dark:bg-slate-900/95 lg:bg-white lg:dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-xl lg:shadow-none min-h-screen">
        
        {/* Header trên Form: Logo + Brand + Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-md shadow-blue-500/25">
              ₫
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                FinanceFlow
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Tài chính cá nhân
              </span>
            </div>
          </div>

          {/* Nút chuyển Dark/Light Mode */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="cursor-pointer rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {darkMode ? (
              <IconSun className="w-4 h-4 text-amber-400" />
            ) : (
              <IconMoon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Nội dung trung tâm: Form tương tác */}
        <div className="my-auto py-8 max-w-md w-full mx-auto">
          {/* Tiêu đề & Lời chào phù hợp từng flow */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {flow === "login" && "Chào mừng trở lại"}
              {flow === "register" && "Tạo tài khoản mới"}
              {flow === "forgot" && "Khôi phục mật khẩu"}
              {flow === "reset" && "Thiết lập mật khẩu mới"}
              {flow === "verifying" && "Đang xác thực tài khoản"}
              {flow === "verified" && "Xác thực thành công"}
              {flow === "verify-error" && "Không thể xác thực"}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {flow === "login" && "Đăng nhập để theo dõi dòng tiền, ngân sách và mục tiêu tiết kiệm."}
              {flow === "register" && "Bắt đầu quản lý tài chính cá nhân thông minh và an toàn cùng AI."}
              {flow === "forgot" && "Nhập email đăng ký của bạn. Chúng tôi sẽ gửi liên kết khôi phục an toàn."}
              {flow === "reset" && "Vui lòng nhập mật khẩu mới tối thiểu 8 ký tự để bảo vệ tài khoản."}
              {flow === "verifying" && "Vui lòng chờ trong giây lát trong khi chúng tôi kích hoạt tài khoản..."}
              {flow === "verified" && "Email của bạn đã được xác nhận. Bây giờ bạn có thể đăng nhập bình thường."}
              {flow === "verify-error" && "Liên kết xác thực không hợp lệ hoặc đã hết hạn sử dụng."}
            </p>
          </div>

          {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
          {(flow === "login" || flow === "register") && (
            <div className="mb-6 grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
              <button
                type="button"
                onClick={() => switchFlow("login")}
                className={`cursor-pointer rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 ${
                  flow === "login"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => switchFlow("register")}
                className={`cursor-pointer rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 ${
                  flow === "register"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {/* Form nhập liệu */}
          {isForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tên hiển thị (chỉ khi đăng ký) */}
              {flow === "register" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Họ và tên <span className="text-slate-400 font-normal">(không bắt buộc)</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="name"
                    maxLength={100}
                    placeholder="VD: Minh Quân"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-blue-400 transition-all"
                  />
                </div>
              )}

              {/* Email */}
              {flow !== "reset" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="ban@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-blue-400 transition-all"
                  />
                </div>
              )}

              {/* Password */}
              {flow !== "forgot" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={flow === "reset" ? 8 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={flow === "login" ? "current-password" : "new-password"}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-4 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-blue-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {flow === "register" && (
                    <span className="mt-1.5 block text-[11px] text-slate-400 dark:text-slate-500">
                      Tối thiểu 8 ký tự, gồm cả chữ và số để tăng độ an toàn.
                    </span>
                  )}
                  {flow === "login" && (
                    <div className="flex items-center justify-between pt-2.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:checked:bg-blue-600 transition-colors cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          Lưu phiên đăng nhập
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => switchFlow("forgot")}
                        className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Password Confirm (chỉ khi Reset) */}
              {flow === "reset" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Xác nhận lại mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      required
                      minLength={8}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-4 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-blue-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="cursor-pointer absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title={showPasswordConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPasswordConfirm ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Cảnh báo lỗi */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/40 p-3 text-xs font-semibold text-rose-700 dark:text-rose-400">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Thông báo thành công */}
              {notice && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <IconCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="leading-relaxed">{notice}</span>
                </div>
              )}

              {/* Nút bấm Submit chính */}
              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 py-3.5 font-bold text-sm text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 active:scale-[0.99] transition-all disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang xử lý...</span>
                  </>
                ) : flow === "login" ? (
                  "Đăng nhập ngay"
                ) : flow === "register" ? (
                  "Tạo tài khoản miễn phí"
                ) : flow === "forgot" ? (
                  "Gửi liên kết khôi phục"
                ) : (
                  "Cập nhật mật khẩu mới"
                )}
              </button>
            </form>
          ) : (
            /* Màn hình Trạng thái Email Verification */
            <div className="space-y-4">
              {flow === "verifying" && (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mb-3" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Đang kích hoạt tài khoản của bạn...</p>
                </div>
              )}

              {flow === "verified" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-4 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                    <IconCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Xác thực hoàn tất</h3>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{notice}</p>
                </div>
              )}

              {flow === "verify-error" && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/40 p-4 text-center">
                  <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">Xác thực thất bại</h3>
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => switchFlow("login")}
                className="cursor-pointer w-full rounded-xl bg-blue-600 py-3.5 font-bold text-sm text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                Quay lại trang Đăng nhập
              </button>
            </div>
          )}

          {/* Các nút phụ bên dưới form */}
          {flow === "login" && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Chưa nhận được email xác nhận?</span>
              <button
                type="button"
                disabled={submitting}
                onClick={handleResendVerification}
                className="cursor-pointer font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                Gửi lại email kích hoạt
              </button>
            </div>
          )}

          {(flow === "forgot" || flow === "reset") && (
            <button
              type="button"
              onClick={() => switchFlow("login")}
              className="cursor-pointer mt-5 w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
            >
              ← Quay lại Đăng nhập
            </button>
          )}
        </div>

        {/* Footer bảo mật trên Cột trái */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <IconShield className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span>Bảo mật 256-bit chuẩn ngân hàng • Dữ liệu lưu biệt lập</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CỘT PHẢI: FINTECH BRAND SHOWCASE & LIVE DEMO PREVIEW       */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-10 xl:p-14 flex-col justify-between text-white select-none">
        {/* Glow Orb Hiệu ứng Ánh sáng nền FinTech */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-96 w-96 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-cyan-500/10 blur-[90px]" />

        {/* Lưới Grid tinh tế phong cách SaaS */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Header Cột phải: Badge Công nghệ AI & Nền tảng */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-md">
            <IconSparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>FinanceFlow Intelligence 2.0</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Bảo mật cấp Doanh nghiệp</span>
        </div>

        {/* Phần trung tâm Cột phải: Thẻ Mô phỏng FinTech Sống động */}
        <div className="relative z-10 my-auto py-8 max-w-lg mx-auto w-full space-y-5">
          {/* Slogan chính */}
          <div className="space-y-2">
            <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
              Quản lý tài chính cá nhân{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                chuẩn xác & thông minh
              </span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Theo dõi dòng tiền đa tài khoản, lập ngân sách chi tiêu kỷ luật và tối ưu hóa các khoản tiết kiệm với sự đồng hành của Trợ lý AI.
            </p>
          </div>

          {/* FinTech Mockup Card 1: Tổng tài sản & Tăng trưởng */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <IconWallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 block">Tổng tài sản khả dụng</span>
                  <span className="text-2xl font-black text-white tracking-tight tabular-nums">
                    185.450.000 ₫
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-400 tabular-nums">
                ↑ +14.8%
              </span>
            </div>

            {/* Thanh tiến độ ngân sách trực quan */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-medium">Ngân sách chi tiêu tháng này</span>
                <span className="text-white font-bold tabular-nums">62% (An toàn)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 w-[62%]" />
              </div>
            </div>
          </div>

          {/* FinTech Mockup Card 2: AI Cố vấn Tài chính */}
          <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 p-5 backdrop-blur-xl shadow-xl flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shrink-0 shadow-md shadow-orange-500/20">
              <IconSparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">Trợ lý AI Độc quyền</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                "Tháng này dòng tiền của bạn thặng dư 12.5 triệu. Bạn nên phân bổ 50% vào sổ tiết kiệm kỳ hạn 6 tháng tại ngân hàng để nhận thêm lãi suất."
              </p>
            </div>
          </div>

          {/* 3 Trụ Cột Giá Trị Nhanh */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 text-center">
              <span className="text-base font-extrabold text-blue-400 block tabular-nums">100%</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Dữ liệu biệt lập</span>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 text-center">
              <span className="text-base font-extrabold text-cyan-400 block tabular-nums">0.5s</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">AI phản hồi</span>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 text-center">
              <span className="text-base font-extrabold text-indigo-400 block tabular-nums">0 ₫</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Phí khởi tạo</span>
            </div>
          </div>
        </div>

        {/* Footer Cột phải: Trích dẫn & Bản quyền */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-white/10 pt-4">
          <span>© {new Date().getFullYear()} FinanceFlow Platform</span>
          <span>Nền tảng Quản lý Tài chính Thông minh</span>
        </div>
      </div>
    </div>
  );
}
