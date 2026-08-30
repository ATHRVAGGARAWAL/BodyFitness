import { describe, expect, it } from "vitest";
import { deriveAchievements, effectiveStepSnapshot, healthSourceLabel } from "./index";

describe("shared fitness core", () => {
  it("prefers an explicit manual step override", () => {
    const provider = { date: "2026-08-19", steps: 8000, source: "apple-health" as const, deviceId: "ios", syncedAt: "2026-08-19T10:00:00.000Z", isManualOverride: false };
    const manual = { date: "2026-08-19", steps: 9000, source: "manual" as const, deviceId: null, syncedAt: "2026-08-19T10:05:00.000Z", isManualOverride: true };
    expect(effectiveStepSnapshot(provider, manual)?.steps).toBe(9000);
  });

  it("derives deterministic step and workout achievements", () => {
    const result = deriveAchievements({ userId: "user_1", date: "2026-08-19", steps: 10000, stepTarget: 10000, currentStepStreak: 7, workoutCount: 10, personalRecords: [] });
    expect(result.map((item) => item.kind)).toEqual(["step-goal", "step-streak", "workout-count"]);
  });

  it("uses readable health source labels", () => {
    expect(healthSourceLabel("health-connect")).toBe("Health Connect");
  });
});
