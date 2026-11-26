import { describe, expect, it } from "vitest";
import {
  addDaysDateOnly,
  calculateRentalDays,
  dateRangesOverlap,
  getCountdownParts,
} from "../src/domain/dates.js";

describe("Backend IST Date & Overlap Utilities", () => {
  it("counts inclusive rental days", () => {
    expect(calculateRentalDays("2026-12-01", "2026-12-01")).toBe(1);
    expect(calculateRentalDays("2026-12-01", "2026-12-04")).toBe(4);
  });

  it("rejects inverted date ranges", () => {
    expect(() => calculateRentalDays("2026-12-05", "2026-12-03")).toThrow();
  });

  it("detects overlapping ranges including 1-day cleaning buffer", () => {
    const bufferEnd = addDaysDateOnly("2026-12-03", 1);
    expect(dateRangesOverlap("2026-12-01", bufferEnd, "2026-12-04", "2026-12-06")).toBe(true);
    expect(dateRangesOverlap("2026-12-01", bufferEnd, "2026-12-05", "2026-12-07")).toBe(false);
  });

  it("formats countdown labels", () => {
    const now = Date.UTC(2026, 10, 26, 10, 0, 0);
    const future = new Date(now + 15 * 60 * 1000).toISOString();
    expect(getCountdownParts(future, now).label).toBe("15:00");
    expect(getCountdownParts(new Date(now - 1000).toISOString(), now).expired).toBe(true);
  });
});
