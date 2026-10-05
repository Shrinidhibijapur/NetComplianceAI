import React, { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, RefreshCw, Layers } from "lucide-react";
import { api } from "../api";
import type { FleetSummary } from "../types";
import { toast } from "../toast";

interface PosturePanelProps {
  currentFramework: string;
  onFrameworkChange?: (framework: string) => void;
  className?: string;
}

export const PosturePanel: React.FC<PosturePanelProps> = ({
  currentFramework,
  onFrameworkChange,
  className = "",
}) => {
  const [data, setData] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [frameworks, setFrameworks] = useState<string[]>(["CIS", "NIST", "STIG", "ISO"]);

  const fetchSummary = async (fw: string) => {
    setLoading(true);
    try {
      const summary = await api.getFleetSummary(fw);
      setData(summary);
    } catch {
      toast(`Failed to load fleet posture for ${fw}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.listFrameworks().then(setFrameworks).catch(() => {});
  }, []);

  useEffect(() => {
    fetchSummary(currentFramework);
  }, [currentFramework]);

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (score >= 60) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    return "text-rose-400 border-rose-500/40 bg-rose-500/10";
  };

  const progressBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className={`bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-lg ${className}`}>
      {/* Header & Framework selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Fleet Compliance Posture
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {data?.total_devices ?? 0} Devices
              </span>
            </h2>
            <p className="text-xs text-slate-400">Aggregated security controls evaluation across entire fleet</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Framework:</span>
            <select
              value={currentFramework}
              onChange={(e) => onFrameworkChange?.(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer hover:text-emerald-400 transition-colors"
            >
              {frameworks.map((fw) => (
                <option key={fw} value={fw} className="bg-slate-900 text-slate-200">
                  {fw.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchSummary(currentFramework)}
            disabled={loading}
            title="Refresh posture data"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          Evaluating fleet posture...
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Score Gauge Card */}
          <div className="md:col-span-1 bg-slate-950/60 rounded-lg p-4 border border-slate-800 flex flex-col justify-between">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Fleet Compliance Score</div>
            <div className="my-3 flex items-baseline justify-between">
              <span className={`text-4xl font-extrabold tracking-tight ${scoreColor(data.fleet_score).split(" ")[0]}`}>
                {data.fleet_score}%
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-md border font-semibold ${scoreColor(data.fleet_score)}`}>
                {data.fleet_score >= 80 ? "HEALTHY" : data.fleet_score >= 60 ? "NEEDS ATTENTION" : "CRITICAL"}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${progressBg(data.fleet_score)}`}
                style={{ width: `${data.fleet_score}%` }}
              />
            </div>
          </div>

          {/* Pass/Fail/Unknown Status Counts */}
          <div className="md:col-span-2 bg-slate-950/60 rounded-lg p-4 border border-slate-800 flex flex-col justify-between">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Controls Status Breakdown</div>
            <div className="grid grid-cols-3 gap-3 my-auto">
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 text-center">
                <div className="text-xs text-emerald-400/80 font-medium">PASSED</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{data.fleet_pass_total}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Controls Verified</div>
              </div>

              <div className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-3 text-center">
                <div className="text-xs text-rose-400/80 font-medium">FAILED</div>
                <div className="text-2xl font-bold text-rose-400 mt-1">{data.fleet_fail_total}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Non-Compliant</div>
              </div>

              <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 text-center">
                <div className="text-xs text-amber-400/80 font-medium">UNKNOWN</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{data.fleet_unknown_total}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Unparsed Lines</div>
              </div>
            </div>
          </div>

          {/* Severity breakdown for fails */}
          <div className="md:col-span-1 bg-slate-950/60 rounded-lg p-4 border border-slate-800 flex flex-col justify-between">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Failed Rule Severity
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  High Severity
                </span>
                <span className="font-mono font-bold text-rose-400">{data.high_severity_fails}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Medium Severity
                </span>
                <span className="font-mono font-bold text-amber-400">{data.medium_severity_fails}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Low Severity
                </span>
                <span className="font-mono font-bold text-slate-400">{data.low_severity_fails}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
