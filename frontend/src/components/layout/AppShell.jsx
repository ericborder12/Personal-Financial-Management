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
    <div className="flex min-h-screen bg-[#f6f7f3] text-slate-800 antialiased selection:bg-[#d2edb8] selection:text-[#173b2d] dark:bg-[#0d1510] dark:text-slate-100">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        user={user}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
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
        <main className="mx-auto w-full max-w-[1480px] flex-1 space-y-6 p-4 sm:space-y-7 sm:p-6 xl:p-8">
          {children}
        </main>
      </div>

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
