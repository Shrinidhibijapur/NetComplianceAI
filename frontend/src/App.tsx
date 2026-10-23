import { useState, useEffect, useCallback } from "react";
import { AppShell } from "./layouts/AppShell";
import { CommandCenterPage } from "./components/CommandCenterPage";
import { UploadPage } from "./components/UploadPage";
import { BulkJobsPage } from "./components/BulkJobsPage";
import { DevicesPage } from "./components/DevicesPage";
import { FindingsPage } from "./components/FindingsPage";
import { ReportsPage } from "./components/ReportsPage";
import { AuditLogsPage } from "./components/AuditLogsPage";
import { TrainingPage } from "./components/TrainingPage";
import { LearnedRulesPage } from "./components/LearnedRulesPage";
import { FrameworksPage } from "./components/FrameworksPage";
import { SecurityUsersPage } from "./components/SecurityUsersPage";
import { Landing } from "./components/Landing";
import { BootSequence } from "./components/BootSequence";
import { AuthModal } from "./components/common/AuthModal";
import { useRouter } from "./router";
import { api, getAuthToken, setAuthToken } from "./api";
import { toast } from "./toast";

interface UserProfile {
  username: string;
  role: string;
}

function App() {
  const { entered, tab, navigateTab, navigateLanding, enterConsole } = useRouter();
  const [launching, setLaunching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [trainDeviceId, setTrainDeviceId] = useState<number | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const token = getAuthToken();
    if (token) {
      const savedUser = localStorage.getItem("complianceai_user");
      if (savedUser) {
        try {
          return JSON.parse(savedUser) as UserProfile;
        } catch {
          // ignore parse errors
        }
      }
      return { username: "admin", role: "admin" };
    }
    return null;
  });

  // Verify auth on mount if token is saved
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api
        .getCurrentUser()
        .then((user) => {
          const profile: UserProfile = { username: user.username, role: user.role };
          setCurrentUser(profile);
          localStorage.setItem("complianceai_user", JSON.stringify(profile));
        })
        .catch(() => {
          // Token expired or invalid, reset
          setAuthToken(null);
          localStorage.removeItem("complianceai_user");
          setCurrentUser(null);
        });
    }
  }, []);

  const handleSignOut = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem("complianceai_user");
    setCurrentUser(null);
    toast.info("Signed out of ComplianceAI");
  }, []);

  const handleAuthSuccess = useCallback((user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem("complianceai_user", JSON.stringify(user));
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        navigateTab("findings");
      }
    },
    [navigateTab]
  );

  if (!entered) {
    if (launching) {
      return (
        <BootSequence
          onComplete={() => {
            setLaunching(false);
            enterConsole("dashboard");
          }}
        />
      );
    }
    return (
      <>
        <Landing
          onEnter={() => setLaunching(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <>
      <AppShell
        activeTab={tab}
        onSelectTab={(newTab) => navigateTab(newTab)}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onExit={() => navigateLanding()}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSearch={handleSearch}
      >
        {tab === "dashboard" && (
          <CommandCenterPage
            onSelectTab={(newTab) => navigateTab(newTab)}
            refreshKey={refreshKey}
          />
        )}
        {tab === "upload" && (
          <UploadPage
            onUploaded={() => {
              setRefreshKey((k) => k + 1);
              navigateTab("devices");
            }}
          />
        )}
        {tab === "bulk" && (
          <BulkJobsPage refreshKey={refreshKey} />
        )}
        {tab === "devices" && (
          <DevicesPage
            refreshKey={refreshKey}
            onTrain={(id) => {
              setTrainDeviceId(id);
              navigateTab("training");
            }}
          />
        )}
        {tab === "findings" && (
          <FindingsPage refreshKey={refreshKey} />
        )}
        {tab === "reports" && (
          <ReportsPage refreshKey={refreshKey} />
        )}
        {tab === "audit" && (
          <AuditLogsPage refreshKey={refreshKey} />
        )}
        {tab === "training" && (
          <TrainingPage refreshKey={refreshKey} selectedDeviceId={trainDeviceId} />
        )}
        {tab === "rules" && (
          <LearnedRulesPage refreshKey={refreshKey} />
        )}
        {tab === "frameworks" && (
          <FrameworksPage refreshKey={refreshKey} />
        )}
        {tab === "security" && (
          <SecurityUsersPage refreshKey={refreshKey} />
        )}
      </AppShell>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}

export default App;
