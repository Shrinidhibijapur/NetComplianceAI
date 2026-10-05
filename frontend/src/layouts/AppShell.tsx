import React from "react";
import { Sidebar, type NavTab } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { Toaster } from "../components/Toaster";

interface AppShellProps {
  readonly activeTab: NavTab;
  readonly onSelectTab: (tab: NavTab) => void;
  readonly onRefresh: () => void;
  readonly onExit?: () => void;
  readonly children: React.ReactNode;
}

export function AppShell({ activeTab, onSelectTab, onRefresh, onExit, children }: AppShellProps) {
  return (
    <div className="shell-container">
      <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} onExit={onExit} />
      <div className="main-viewport">
        <Topbar activeTab={activeTab} onRefresh={onRefresh} />
        <main className="content-scrollable">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
