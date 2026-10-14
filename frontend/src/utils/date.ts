/**
 * Utility to parse and format dates according to Indian Standard Time (IST / Asia/Kolkata, UTC+5:30).
 */

export function parseUtcDate(dateVal: string | Date | undefined | null): Date {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  let str = String(dateVal).trim();
  // If naive ISO format like '2026-10-14T17:16:00' or '2026-10-14 17:16:00', treat as UTC
  str = str.replace(" ", "T");
  if (!str.endsWith("Z") && !str.includes("+") && !str.includes("-", 10)) {
    str += "Z";
  }
  return new Date(str);
}

export function formatIndianDateTime(
  dateVal: string | Date | undefined | null,
  options?: { includeSeconds?: boolean; hour12?: boolean }
): string {
  if (!dateVal) return "—";
  try {
    const d = parseUtcDate(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);

    const dateStr = d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const timeStr = d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: options?.includeSeconds ? "2-digit" : undefined,
      hour12: options?.hour12 ?? false,
    });

    return `${dateStr}, ${timeStr} IST`;
  } catch {
    return String(dateVal);
  }
}
