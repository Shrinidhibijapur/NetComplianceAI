import { useState } from "react";
import { AppShell } from "./layouts/AppShell";
import type { NavTab } from "./components/layout/Sidebar";
import { CommandCenterPage } from "./components/CommandCenterPage";
import { UploadPage } from "./components/UploadPage";
import { DevicesPage } from "./components/DevicesPage";
import { FindingsPage } from "./components/FindingsPage";
import { TrainingPage } from "./components/TrainingPage";
import { LearnedRulesPage } from "./components/LearnedRulesPage";
import { AuditLogsPage } from "./components/AuditLogsPage";
import { Landing } from "./components/Landing";
import { BootSequence } from "./components/BootSequence";

function App() {
  const [entered, setEntered] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [tab, setTab] = useState<NavTab>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [trainDeviceId, setTrainDeviceId] = useState<number | null>(null);

  if (!entered) {
    if (launching) {
      return <BootSequence onComplete={() => setEntered(true)} />;
    }
    return <Landing onEnter={() => setLaunching(true)} />;
  }

  return (
    <AppShell
      activeTab={tab}
      onSelectTab={(newTab) => setTab(newTab)}
      onRefresh={() => setRefreshKey((k) => k + 1)}
      onExit={() => setEntered(false)}
    >
      {tab === "dashboard" && (
        <CommandCenterPage
          onSelectTab={(newTab) => setTab(newTab)}
          refreshKey={refreshKey}
        />
      )}
      {tab === "upload" && (
        <UploadPage
          onUploaded={() => {
            setRefreshKey((k) => k + 1);
            setTab("devices");
          }}
        />
      )}
      {tab === "devices" && (
        <DevicesPage
          refreshKey={refreshKey}
          onTrain={(id) => {
            setTrainDeviceId(id);
            setTab("training");
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
