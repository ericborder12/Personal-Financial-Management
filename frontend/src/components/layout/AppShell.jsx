import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ProfileModal from "../profile/ProfileModal";

export default function AppShell({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onOpenQuickTransaction,
  onProfileUpdated,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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

  return (
    <div className="flex min-h-screen bg-slate-50/70 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Sidebar navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        user={user}
        onOpenProfile={() => setProfileOpen(true)}
      />

      {/* Main content column */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          activeTab={activeTab}
          user={user}
          onLogout={onLogout}
          onOpenQuickTransaction={onOpenQuickTransaction}
          setMobileOpen={setMobileOpen}
          onOpenProfile={() => setProfileOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        <main className="flex-1 p-5 sm:p-7 lg:p-9 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* User Profile & Settings Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onProfileUpdated={onProfileUpdated}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    </div>
  );
}
