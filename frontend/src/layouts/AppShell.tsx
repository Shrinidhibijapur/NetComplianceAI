import React from "react";
import { Sidebar, type NavTab } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { Toaster } from "../components/Toaster";

interface UserProfile {
  username: string;
  role: string;
}

interface AppShellProps {
  readonly activeTab: NavTab;
  readonly onSelectTab: (tab: NavTab) => void;
  readonly onRefresh: () => void;
  readonly onExit?: () => void;
  readonly currentUser?: UserProfile | null;
  readonly onSignOut?: () => void;
  readonly onOpenAuth?: () => void;
  readonly onSearch?: (query: string) => void;
  readonly children: React.ReactNode;
}

export function AppShell({
  activeTab,
  onSelectTab,
  currentUser,
  onSignOut,
  onOpenAuth,
  onSearch,
  children,
}: AppShellProps) {
  return (
    <div className="shell-container">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        currentUser={currentUser}
        onSignOut={onSignOut}
        onSignIn={onOpenAuth}
      />
      <div className="main-viewport">
        <Topbar
          activeTab={activeTab}
          currentUser={currentUser}
          onSearch={onSearch}
          onOpenAuth={onOpenAuth}
          onSignOut={onSignOut}
        />
        <main className="content-scrollable">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}

