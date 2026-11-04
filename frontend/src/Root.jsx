import { useAuth } from "./auth/useAuth";
import App from "./App";
import LoginPage from "./pages/LoginPage";

export default function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-950">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        <span className="mt-3 text-xs font-semibold text-slate-500">Đang khởi động FinanceFlow...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <App />;
}
