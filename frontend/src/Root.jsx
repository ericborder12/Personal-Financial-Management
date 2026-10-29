import { useAuth } from "./auth/useAuth";
import App from "./App";
import LoginPage from "./pages/LoginPage";

export default function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <App />;
}
