import { useEffect, useState } from "react";
import { api } from "../api/client";
import { errorMessage } from "../api/errors";
import { useAuth } from "../auth/useAuth";

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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        await login(email.trim(), password);
      } else if (flow === "register") {
        const result = await register(email.trim(), password, displayName.trim());
        setNotice(result.detail);
      } else if (flow === "forgot") {
        const result = await api.requestPasswordReset({ email: email.trim() });
        setNotice(result.detail);
      } else if (flow === "reset") {
        if (password !== passwordConfirm) {
          throw new Error("Mật khẩu xác nhận không khớp.");
        }
        const result = await api.confirmPasswordReset({
          ...emailToken,
          password,
        });
        setNotice(result.detail);
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
      setError("Nhập email để gửi lại liên kết xác thực.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.resendVerificationEmail({ email: email.trim() });
      setNotice(result.detail);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isForm = ["login", "register", "forgot", "reset"].includes(flow);
  const title =
    flow === "forgot"
      ? "Quên mật khẩu"
      : flow === "reset"
        ? "Đặt lại mật khẩu"
        : "Quản lý tài chính";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-100 px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-3xl text-white shadow-lg shadow-indigo-500/25">
            💸
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Tài chính cá nhân
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {flow === "register"
              ? "Tạo tài khoản để bắt đầu theo dõi thu chi"
              : flow === "forgot"
                ? "Nhập email để nhận liên kết đặt lại mật khẩu"
                : flow === "reset"
                  ? "Chọn mật khẩu mới cho tài khoản"
                  : "Đăng nhập để tiếp tục theo dõi thu chi"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-xl shadow-indigo-950/10 sm:p-8">
          {(flow === "login" || flow === "register") && (
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchFlow("login")}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  flow === "login"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => switchFlow("register")}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  flow === "register"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {isForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {flow === "register" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Tên hiển thị <span className="text-slate-400">(không bắt buộc)</span>
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                    maxLength={100}
                    placeholder="Ví dụ: Minh"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              )}

              {flow !== "reset" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="ban@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              )}

              {flow !== "forgot" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu</span>
                  <input
                    type="password"
                    required
                    minLength={flow === "reset" ? 8 : undefined}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={flow === "login" ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                  {flow === "register" && (
                    <span className="mt-1 block text-xs text-slate-400">
                      Tối thiểu 8 ký tự, không dùng mật khẩu quá phổ biến.
                    </span>
                  )}
                </label>
              )}

              {flow === "reset" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Nhập lại mật khẩu</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              )}

              {error && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
              )}
              {notice && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Đang xử lý..."
                  : flow === "login"
                    ? "Đăng nhập"
                    : flow === "register"
                      ? "Tạo tài khoản"
                      : flow === "forgot"
                        ? "Gửi liên kết"
                        : "Cập nhật mật khẩu"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {flow === "verifying" && (
                <p className="text-center text-sm text-slate-500">Đang xác thực email...</p>
              )}
              {flow === "verified" && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
              )}
              {flow === "verify-error" && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
              )}
              <button
                type="button"
                onClick={() => switchFlow("login")}
                className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700"
              >
                Đến đăng nhập
              </button>
            </div>
          )}

          {flow === "login" && (
            <div className="mt-3 flex flex-col gap-2 text-center">
              <button
                type="button"
                onClick={() => switchFlow("forgot")}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Quên mật khẩu?
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleResendVerification}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                Gửi lại email xác thực
              </button>
            </div>
          )}
          {(flow === "forgot" || flow === "reset") && (
            <button
              type="button"
              onClick={() => switchFlow("login")}
              className="mt-3 w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Quay lại đăng nhập
            </button>
          )}

          <p className="mt-5 text-center text-xs text-slate-400">
            Dữ liệu của mỗi tài khoản được lưu riêng trên máy chủ.
          </p>
        </div>
      </div>
    </div>
  );
}
