import { describe, expect, it } from "vitest";
import { effectiveStepSnapshot } from "@bodyfitness/core";
import { localDayRange, localDateKey } from "../lib/date";
import { normalizeAggregatedSteps } from "./step-values";

describe("native health step policy", () => {
  it("uses the platform aggregate as one total instead of summing sources", () => {
    expect(normalizeAggregatedSteps(8123.6)).toBe(8124);
    expect(normalizeAggregatedSteps(-20)).toBe(0);
  });

  it("lets a manual override replace and then reveal the device total", () => {
    const provider = { date: "2026-08-19", steps: 8200, source: "apple-health" as const, deviceId: "iphone", syncedAt: "2026-08-19T10:00:00.000Z", isManualOverride: false };
    const manual = { date: "2026-08-19", steps: 9000, source: "manual" as const, deviceId: null, syncedAt: "2026-08-19T10:05:00.000Z", isManualOverride: true };
    expect(effectiveStepSnapshot(provider, manual)?.steps).toBe(9000);
    expect(effectiveStepSnapshot(provider, null)?.steps).toBe(8200);
  });

  it("builds daily query bounds from local calendar midnight", () => {
    const date = new Date(2026, 7, 19, 18, 30);
    const { start, end } = localDayRange(date);
    expect(localDateKey(start)).toBe("2026-08-19");
    expect(localDateKey(end)).toBe("2026-08-20");
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(0);
  });
});
