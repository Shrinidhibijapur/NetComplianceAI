import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { ConfigSummary } from "../types";
import { ConfidenceMeter } from "./Badges";
import { ResultsPanel } from "./ResultsPanel";

export function DevicesPage({
  refreshKey,
  onTrain,
}: {
  refreshKey: number;
  onTrain: (id: number) => void;
}) {
  const [records, setRecords] = useState<ConfigSummary[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .listRecords()
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!records) return null;
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) => r.device_id.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q),
    );
  }, [records, query]);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Devices</h1>
        <p>Every ingested config, its L1 parse confidence, and per-framework compliance results.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {records && records.length === 0 && (
        <div className="card">
          <div className="empty">No devices ingested yet — head to Upload to add one.</div>
        </div>
      )}

      {records && records.length > 0 && (
        <>
          <div className="search-bar">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by device ID or vendor…"
            />
            <span className="faint">
              {filtered?.length ?? 0} / {records.length} device(s)
            </span>
          </div>

          <div className="device-grid">
            {filtered?.map((r) => {
              const isOpen = expanded === r.id;
              return (
                <div
                  key={r.id}
                  className={`device-card${isOpen ? " expanded" : ""}`}
                  onClick={() => !isOpen && setExpanded(r.id)}
                >
                  <div className="device-card-head">
                    <div>
                      <strong>{r.device_id}</strong>
                      <div className="device-card-meta">
                        <span>{r.vendor}</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      title={isOpen ? "Collapse" : "Expand"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(isOpen ? null : r.id);
                      }}
                    >
                      {isOpen ? "▲" : "▼"}
                    </button>
                  </div>

                  <div className="device-card-foot">
                    <ConfidenceMeter value={r.parse_confidence} />
                    <span className={r.unmapped_count > 0 ? "faint" : "muted"}>
                      {r.unmapped_count > 0 ? `${r.unmapped_count} unmapped` : "fully parsed"}
                    </span>
                  </div>

                  {isOpen && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: "var(--space-4)" }}>
                      <ResultsPanel record={r} onTrain={() => onTrain(r.id)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
