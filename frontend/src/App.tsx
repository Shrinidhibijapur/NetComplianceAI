import { useState } from "react";
import { AppShell } from "./layouts/AppShell";
import { CommandCenterPage } from "./components/CommandCenterPage";
import { UploadPage } from "./components/UploadPage";
import { DevicesPage } from "./components/DevicesPage";
import { FindingsPage } from "./components/FindingsPage";
import { TrainingPage } from "./components/TrainingPage";
import { LearnedRulesPage } from "./components/LearnedRulesPage";
import { AuditLogsPage } from "./components/AuditLogsPage";
import { Landing } from "./components/Landing";
import { BootSequence } from "./components/BootSequence";
import { useRouter } from "./router";

function App() {
  const { entered, tab, navigateTab, navigateLanding, enterConsole } = useRouter();
  const [launching, setLaunching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [trainDeviceId, setTrainDeviceId] = useState<number | null>(null);

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
    return <Landing onEnter={() => setLaunching(true)} />;
  }

  return (
    <AppShell
      activeTab={tab}
      onSelectTab={(newTab) => navigateTab(newTab)}
      onRefresh={() => setRefreshKey((k) => k + 1)}
      onExit={() => navigateLanding()}
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
      {tab === "training" && (
        <TrainingPage refreshKey={refreshKey} selectedDeviceId={trainDeviceId} />
      )}
      {tab === "rules" && (
        <LearnedRulesPage refreshKey={refreshKey} />
      )}
      {tab === "audit" && (
        <AuditLogsPage refreshKey={refreshKey} />
      )}
    </AppShell>
  );
}

export default App;
