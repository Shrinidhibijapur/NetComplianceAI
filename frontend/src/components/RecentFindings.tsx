import React from "react";
import { CheckCircle2, FileCode2, ShieldAlert, ArrowRight } from "lucide-react";
import type { Finding } from "../types";

interface ExtendedFindingItem extends Finding {
  deviceId: string;
  vendor: string;
  configId: number;
}

interface RecentFindingsProps {
  findings: ExtendedFindingItem[];
  loading?: boolean;
  onSelectFinding?: (finding: ExtendedFindingItem) => void;
  onViewAll?: () => void;
  className?: string;
}

export const RecentFindings: React.FC<RecentFindingsProps> = ({
  findings,
  loading = false,
  onSelectFinding,
  onViewAll,
  className = "",
}) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">HIGH</span>;
      case "medium":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">MED</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-slate-800 text-slate-400 border border-slate-700">LOW</span>;
    }
  };

  return (
    <div className={`bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Action Required: Recent Non-Compliant Findings</h3>
            <p className="text-xs text-slate-400">Controls requiring remediation across audited devices</p>
          </div>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            <span>View All Findings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading non-compliant findings...</div>
      ) : findings.length === 0 ? (
        <div className="py-8 text-center bg-slate-950/40 rounded-lg border border-slate-800/80">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-medium text-slate-200">No Failed Controls Found</p>
          <p className="text-xs text-slate-500 mt-1">All audited devices meet compliance standards for this framework.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {findings.slice(0, 5).map((f, idx) => (
            <div
              key={`${f.configId}-${f.control_id}-${idx}`}
              onClick={() => onSelectFinding?.(f)}
              className="p-3 bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 rounded-lg transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                {getSeverityBadge(f.severity)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">
                      {f.control_id}
                    </span>
                    <span className="text-xs text-slate-200 truncate font-medium">{f.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <FileCode2 className="w-3 h-3 text-slate-500" />
                      {f.deviceId}
                    </span>
                    <span>•</span>
                    <span className="uppercase text-slate-400 font-semibold">{f.vendor}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">key: {f.canonical_key}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                {f.remediation && f.remediation_verified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                    VERIFIED REMEDIATION
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800/80 border border-slate-700/80 px-2 py-0.5 rounded">
                    NO VERIFIED REMEDIATION
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
