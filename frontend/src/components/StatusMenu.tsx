import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";

export function StatusMenu({
  onRefresh,
  onExit,
}: {
  readonly onRefresh: () => void;
  readonly onExit: () => void;
}) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      api
        .health()
        .then(() => !cancelled && setOnline(true))
        .catch(() => !cancelled && setOnline(false));
    };
    check();
    const id = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  let statusClass = "";
  if (online === true) {
    statusClass = "status-online";
  } else if (online === false) {
    statusClass = "status-offline";
  }

  let statusText = "Checking…";
  if (online === true) {
    statusText = "Engine online";
  } else if (online === false) {
    statusText = "Engine offline";
  }

  return (
    <div className="status-menu" ref={menuRef}>
      <span className={`status-pill ${statusClass}`}>
        <span className="status-dot" />
        {statusText}
      </span>
      <button className="status-more" aria-label="Status menu options" onClick={() => setOpen((v) => !v)}>
        ⋮
      </button>
      {open && (
        <div className="status-dropdown">
          <button
            onClick={() => {
              onRefresh();
              toast("Data refreshed", "info");
              setOpen(false);
            }}
          >
            Refresh data
          </button>
          <button
            onClick={() => {
              toast("ComplianceAI — offline-capable multi-vendor compliance auditor.", "info");
              setOpen(false);
            }}
          >
            About
          </button>
          <button
            onClick={() => {
              onExit();
              setOpen(false);
            }}
          >
            Back to landing
          </button>
        </div>
      )}
    </div>
  );
}
