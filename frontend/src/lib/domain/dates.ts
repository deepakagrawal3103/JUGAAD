import { BRAND_CONFIG } from "@/config/brand";

export function parseDateOnly(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) throw new Error(`Invalid date format: ${dateStr}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAND_CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDaysDateOnly(dateStr: string, days: number): string {
  const dt = parseDateOnly(dateStr);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDateOnly(dt);
}

export function formatISTDateTime(isoTimestamp: string | Date): string {
  const d = typeof isoTimestamp === "string" ? new Date(isoTimestamp) : isoTimestamp;
  if (Number.isNaN(d.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("en-IN", {
      timeZone: BRAND_CONFIG.timezone,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d) + " IST"
  );
}

export function formatISTDate(dateStr: string): string {
  const d = dateStr.length === 10 ? parseDateOnly(dateStr) : new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: dateStr.length === 10 ? "UTC" : BRAND_CONFIG.timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function getCountdownParts(targetIso: string, nowMs = Date.now()) {
  const targetMs = new Date(targetIso).getTime();
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  if (diffSec <= 0) return { expired: true, totalSeconds: 0, label: "Expired" };
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  if (days > 0) return { expired: false, totalSeconds: diffSec, label: `${days}d ${hours}h left` };
  if (hours > 0) return { expired: false, totalSeconds: diffSec, label: `${hours}h ${mins}m left` };
  return {
    expired: false,
    totalSeconds: diffSec,
    label: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
  };
}
