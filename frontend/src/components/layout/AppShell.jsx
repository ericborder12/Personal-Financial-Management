import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onOpenQuickTransaction,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50/70 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Sidebar navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main content column */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          activeTab={activeTab}
          user={user}
          onLogout={onLogout}
          onOpenQuickTransaction={onOpenQuickTransaction}
          setMobileOpen={setMobileOpen}
        />

        <main className="flex-1 p-5 sm:p-7 lg:p-9 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
