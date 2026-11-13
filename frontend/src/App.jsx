import React, { useState, useEffect } from "react";
import AppShell from "./components/layout/AppShell";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import AccountsPage from "./pages/AccountsPage";
import CategoriesPage from "./pages/CategoriesPage";
import BudgetsPage from "./pages/BudgetsPage";
import ReportsPage from "./pages/ReportsPage";
import SavingsPage from "./pages/SavingsPage";
import QAPage from "./pages/QAPage";
import SupportPage from "./pages/SupportPage";
import TransactionModal from "./components/transactions/TransactionModal";
import { useAuth } from "./auth/useAuth";
import { useAccounts, useCategories } from "./hooks/useFinance";
import { financeApi } from "./api/finance";

export default function App() {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { accounts, refresh: refreshAccounts } = useAccounts();
  const { categories } = useCategories();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleQuickTxSave = async (data) => {
    await financeApi.createTransaction(data);
    await refreshAccounts();
    setRefreshTrigger((v) => v + 1);
  };

  // Keep admin presence active on site while logged in
  useEffect(() => {
    if (!user?.is_staff && !user?.is_superuser) return;
    financeApi.sendSupportHeartbeat().catch(() => {});
    const interval = setInterval(() => {
      financeApi.sendSupportHeartbeat().catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      onLogout={handleLogout}
      onOpenQuickTransaction={() => setQuickTxOpen(true)}
      onProfileUpdated={refreshUser}
    >
      {activeTab === "dashboard" && (
        <DashboardPage
          key={`dashboard-${refreshTrigger}`}
          onOpenQuickTransaction={() => setQuickTxOpen(true)}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "transactions" && (
        <TransactionsPage
          key={`txs-${refreshTrigger}`}
          onOpenModal={() => setQuickTxOpen(true)}
        />
      )}

      {activeTab === "accounts" && (
        <AccountsPage key={`accounts-${refreshTrigger}`} />
      )}

      {activeTab === "savings" && (
        <SavingsPage key={`savings-${refreshTrigger}`} />
      )}

      {activeTab === "categories" && (
        <CategoriesPage key={`categories-${refreshTrigger}`} />
      )}

      {activeTab === "budgets" && (
        <BudgetsPage key={`budgets-${refreshTrigger}`} />
      )}

      {activeTab === "reports" && (
        <ReportsPage key={`reports-${refreshTrigger}`} />
      )}

      {activeTab === "qa" && (
        <QAPage key={`qa-${refreshTrigger}`} />
      )}

      {activeTab === "support" && (
        <SupportPage key={`support-${refreshTrigger}`} user={user} />
      )}

      {/* Global Quick Transaction Modal */}
      <TransactionModal
        isOpen={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSave={handleQuickTxSave}
        accounts={accounts}
        categories={categories}
      />
    </AppShell>
  );
}
