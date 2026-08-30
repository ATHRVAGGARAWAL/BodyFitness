import { beforeEach, describe, expect, it } from "vitest";
import { buildSyncEnvelope } from "@/lib/cloud-sync";
import { defaultProfile } from "@/lib/seed";
import { useBodyFitnessStore } from "@/lib/store";

describe("cloud sync preparation", () => {
  beforeEach(() => {
    localStorage.clear();
    useBodyFitnessStore.getState().resetAll();
  });

  it("does not upload untouched defaults from a fresh guest browser", () => {
    expect(buildSyncEnvelope(useBodyFitnessStore.getState()).records).toEqual([]);
  });

  it("only sends records that changed after the canonical revision", () => {
    useBodyFitnessStore.getState().finishOnboarding(defaultProfile);
    const first = buildSyncEnvelope(useBodyFitnessStore.getState());
    expect(first.records.length).toBeGreaterThan(0);
    useBodyFitnessStore.getState().applySyncRecords(first.records);
    expect(buildSyncEnvelope(useBodyFitnessStore.getState()).records).toEqual([]);

    useBodyFitnessStore.getState().setThemePreference("light");
    const changed = buildSyncEnvelope(useBodyFitnessStore.getState()).records;
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({ entity: "settings", revision: 2 });
  });

  it("applies a native step record to the PWA cache", () => {
    useBodyFitnessStore.getState().applySyncRecords([{
      entity: "daily-wellness",
      entityId: "2026-08-19",
      revision: 3,
      updatedAt: "2026-08-19T12:00:00.000Z",
      deletedAt: null,
      payload: { date: "2026-08-19", steps: 8450, stepSource: "apple-health", stepSyncedAt: "2026-08-19T11:58:00.000Z", manualStepOverride: false, waterMl: 0, creatineTaken: false, completedHabitIds: [] },
    }]);
    expect(useBodyFitnessStore.getState().dailyByDate["2026-08-19"]).toMatchObject({ steps: 8450, stepSource: "apple-health", manualStepOverride: false });
  });
});
