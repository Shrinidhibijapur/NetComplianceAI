import { useState, useEffect } from "react";
import type { NavTab } from "./components/layout/Sidebar";

export interface RouteState {
  entered: boolean;
  tab: NavTab;
}

// Canonical path mappings for all console pages
export const TAB_TO_PATH: Record<NavTab, string> = {
  dashboard: "/command-center",
  upload: "/configs",
  devices: "/devices",
  findings: "/compliance",
  audit: "/audit-trail",
  training: "/ai-training",
  rules: "/learned-rules",
};

export const TAB_TITLES: Record<NavTab, { title: string; breadcrumb: string }> = {
  dashboard: { title: "Network Security Command Center", breadcrumb: "Overview / Command Center" },
  upload: { title: "Configuration Ingestion", breadcrumb: "Overview / Config Ingestion" },
  devices: { title: "Audited Infrastructure Devices", breadcrumb: "Overview / Devices" },
  findings: { title: "Compliance Audit & Findings", breadcrumb: "Compliance / Audit & Findings" },
  audit: { title: "Security Audit Trail", breadcrumb: "Compliance / Audit Trail" },
  training: { title: "AI Training & Learning Loop", breadcrumb: "Intelligence / AI Training" },
  rules: { title: "Active Learned Extraction Rules", breadcrumb: "Intelligence / Learned Rules" },
};

export function getRouteFromPath(pathname: string): RouteState {
  let clean = pathname.toLowerCase().trim();
  while (clean.length > 1 && clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  if (!clean) clean = "/";

  switch (clean) {
    case "/configs":
    case "/upload":
    case "/config-ingestion":
      return { entered: true, tab: "upload" };

    case "/devices":
      return { entered: true, tab: "devices" };

    case "/compliance":
    case "/findings":
      return { entered: true, tab: "findings" };

    case "/audit-trail":
    case "/audit":
    case "/audit-logs":
      return { entered: true, tab: "audit" };

    case "/ai-training":
    case "/training":
      return { entered: true, tab: "training" };

    case "/learned-rules":
    case "/rules":
      return { entered: true, tab: "rules" };

    case "/command-center":
    case "/dashboard":
    case "/console":
      return { entered: true, tab: "dashboard" };

    case "/":
    case "/landing":
    default:
      return { entered: false, tab: "dashboard" };
  }
}

export function updateBrowserUrl(path: string, pageTitle?: string): void {
  if (window.location.pathname !== path) {
    window.history.pushState(null, "", path);
  }
  if (pageTitle) {
    document.title = `${pageTitle} | ComplianceAI`;
  }
}

export function useRouter() {
  const [route, setRoute] = useState<RouteState>(() => getRouteFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => {
      setRoute(getRouteFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTab = (newTab: NavTab) => {
    const path = TAB_TO_PATH[newTab] || "/command-center";
    const info = TAB_TITLES[newTab];
    updateBrowserUrl(path, info?.title ?? "Console");
    setRoute({ entered: true, tab: newTab });
  };

  const navigateLanding = () => {
    updateBrowserUrl("/", "AI Network Security Compliance Auditor");
    setRoute({ entered: false, tab: "dashboard" });
  };

  const enterConsole = (initialTab: NavTab = "dashboard") => {
    const path = TAB_TO_PATH[initialTab] || "/command-center";
    const info = TAB_TITLES[initialTab];
    updateBrowserUrl(path, info?.title ?? "Command Center");
    setRoute({ entered: true, tab: initialTab });
  };

  return {
    entered: route.entered,
    tab: route.tab,
    navigateTab,
    navigateLanding,
    enterConsole,
  };
}
