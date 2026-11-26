import { ENV } from "../config/env.js";

export function parseDateOnly(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month ||
    dt.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }
  return dt;
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ENV.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function calculateRentalDays(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    throw new Error("End date must be on or after start date.");
  }
  return Math.floor(diffMs / 86_400_000) + 1;
}

export function addDaysDateOnly(dateStr: string, days: number): string {
  const dt = parseDateOnly(dateStr);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDateOnly(dt);
}

export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
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
