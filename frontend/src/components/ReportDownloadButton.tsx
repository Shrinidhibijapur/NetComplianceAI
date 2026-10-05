import React, { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { api } from "../api";
import { toast } from "../toast";

interface ReportDownloadButtonProps {
  configId: number;
  deviceId: string;
  framework?: string;
  variant?: "primary" | "secondary" | "outline" | "compact";
  className?: string;
}

export const ReportDownloadButton: React.FC<ReportDownloadButtonProps> = ({
  configId,
  deviceId,
  framework = "CIS",
  variant = "outline",
  className = "",
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const url = api.reportPdfUrl(configId, framework);
      // Trigger browser download via invisible link
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deviceId}_${framework}_audit_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast(`Downloading PDF report for ${deviceId} (${framework})`, "success");
    } catch (err) {
      toast(`Failed to download report: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setDownloading(false);
    }
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleDownload}
        disabled={downloading}
        title={`Download ${framework} Audit PDF`}
        className={`p-1.5 rounded-md text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition-colors border border-slate-700 hover:border-emerald-500/40 ${className}`}
      >
        {downloading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <FileText className="w-4 h-4" />}
      </button>
    );
  }

  const baseStyles =
    "inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600",
    outline: "bg-slate-900/60 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60",
    compact: "",
  }[variant];

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {downloading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5" />
          <span>PDF Report</span>
        </>
      )}
    </button>
  );
};
