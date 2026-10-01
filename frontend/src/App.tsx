import { useState } from "react";
import "./App.css";
import { UploadPage } from "./components/UploadPage";
import { DevicesPage } from "./components/DevicesPage";
import { TrainingPage } from "./components/TrainingPage";
import { Landing } from "./components/Landing";
import { Toaster } from "./components/Toaster";
import { BootSequence } from "./components/BootSequence";
import { StatusMenu } from "./components/StatusMenu";

type Tab = "upload" | "devices" | "training";

function App() {
  const [entered, setEntered] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [tab, setTab] = useState<Tab>("upload");
  const [refreshKey, setRefreshKey] = useState(0);
  const [trainDeviceId, setTrainDeviceId] = useState<number | null>(null);

  if (!entered) {
    if (launching) {
      return <BootSequence onComplete={() => setEntered(true)} />;
    }
    return (
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">CA</div>
            <div className="brand-text">
              <strong>ComplianceAI</strong>
              <span>Multi-vendor security compliance auditor</span>
            </div>
          </div>
          <nav className="tabbar">
            <button className="active" onClick={() => setLaunching(true)}>
              Launch console →
            </button>
          </nav>
        </header>
        <Landing onEnter={() => setLaunching(true)} />
      </div>
    );
  }

  const TAB_LABEL: Record<Tab, string> = {
    upload: "Config Ingestion",
    devices: "Devices",
    training: "AI Training Engine",
  };

  return (
    <div className="shell shell-console">
      <aside className="sidebar">
        <button type="button" className="sidebar-brand" onClick={() => setEntered(false)}>
          <div className="brand-mark">CA</div>
          <div className="brand-text">
            <strong>ComplianceAI</strong>
            <span>Compliance Auditor</span>
          </div>
        </button>
        <nav className="sidebar-nav">
          <button className={tab === "upload" ? "active" : ""} onClick={() => setTab("upload")}>
            <span className="sidebar-icon">⇪</span>Upload
          </button>
          <button className={tab === "devices" ? "active" : ""} onClick={() => setTab("devices")}>
            <span className="sidebar-icon">▤</span>Devices
          </button>
          <button className={tab === "training" ? "active" : ""} onClick={() => setTab("training")}>
            <span className="sidebar-icon">◈</span>AI Training
          </button>
        </nav>
        <button className="sidebar-exit" onClick={() => setEntered(false)}>
          ← Back to landing
        </button>
      </aside>

      <div className="shell-main">
        <header className="topbar topbar-console">
          <span className="page-title">{TAB_LABEL[tab]}</span>
          <StatusMenu onRefresh={() => setRefreshKey((k) => k + 1)} onExit={() => setEntered(false)} />
        </header>

        <div className="shell-content">
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
          {tab === "training" && (
            <TrainingPage refreshKey={refreshKey} selectedDeviceId={trainDeviceId} />
          )}
        </div>
      </div>

      <Toaster />
    </div>
  );
}

export default App;
