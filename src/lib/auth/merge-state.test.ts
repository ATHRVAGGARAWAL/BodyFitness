import { describe, expect, it } from "vitest";
import { mergeStates, normalizeOrder, serializableState } from "@/lib/auth/merge-state";

describe("mergeStates", () => {
  it("unions id-keyed collections and lets the server win on the same id", () => {
    const merged = mergeStates(
      { meals: [{ id: "a", name: "server-a" }, { id: "b", name: "b" }], onboardingComplete: true },
      { meals: [{ id: "a", name: "local-a" }, { id: "c", name: "c" }], onboardingComplete: false, hydrated: true },
    );
    const meals = merged.meals as Array<{ id: string; name: string }>;
    expect(meals.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
    expect(meals.find((m) => m.id === "a")?.name).toBe("server-a");
    expect(merged.onboardingComplete).toBe(true);
    expect(merged.hydrated).toBe(true);
  });

  it("merges per-day maps and flex-day sets", () => {
    const merged = mergeStates(
      { dailyByDate: { "2026-09-13": { steps: 9000 } }, flexDays: ["2026-09-01"] },
      { dailyByDate: { "2026-09-12": { steps: 4000 }, "2026-09-13": { steps: 1 } }, flexDays: ["2026-09-01", "2026-09-05"] },
    );
    expect(Object.keys(merged.dailyByDate as object).sort()).toEqual(["2026-09-12", "2026-09-13"]);
    expect((merged.dailyByDate as Record<string, { steps: number }>)["2026-09-13"].steps).toBe(9000);
    expect((merged.flexDays as string[]).sort()).toEqual(["2026-09-01", "2026-09-05"]);
  });

  it("keeps device-only keys from the local copy and drops them from uploads", () => {
    const merged = mergeStates({ restTimer: { endsAt: 1 } }, { restTimer: { endsAt: null }, activeSessionId: "x" });
    expect(merged.restTimer).toEqual({ endsAt: null });
    expect(merged.activeSessionId).toBe("x");
    const upload = serializableState({ meals: [], hydrated: true, restTimer: {}, addMeal: () => {} });
    expect(Object.keys(upload)).toEqual(["meals"]);
  });

  it("re-sorts collections newest first", () => {
    const out = normalizeOrder({ meals: [{ id: "1", loggedAt: "2026-09-01" }, { id: "2", loggedAt: "2026-09-10" }] });
    expect((out.meals as Array<{ id: string }>)[0].id).toBe("2");
  });
});
