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

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const url = api.reportPdfUrl(configId, framework);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deviceId}_${framework}_audit_report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
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
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        title={`Download ${framework} Audit PDF`}
        className={`cc-download-btn-compact ${className}`.trim()}
      >
        {downloading ? (
          <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite", color: "var(--accent-primary)" }} />
        ) : (
          <FileText style={{ width: "14px", height: "14px" }} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={`cc-download-btn ${className}`.trim()}
    >
      {downloading ? (
        <>
          <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <Download style={{ width: "14px", height: "14px" }} />
          <span>PDF Report</span>
        </>
      )}
    </button>
  );
};
