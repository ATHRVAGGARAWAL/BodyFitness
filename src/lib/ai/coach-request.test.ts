import { describe, expect, it } from "vitest";
import { buildCoachRequest, hasEnoughForReview, inferGoal } from "@/lib/ai/coach-request";
import { defaultProfile, defaultTargets } from "@/lib/seed";

const base = {
  profile: { ...defaultProfile },
  targets: { ...defaultTargets },
  meals: [],
  dailyByDate: {},
  sessions: [],
  setLogs: [],
  weightEntries: [],
};

describe("inferGoal", () => {
  it("respects an explicit goal", () => {
    expect(inferGoal({ ...defaultProfile, goal: "maintain" })).toBe("maintain");
  });
  it("reads a modest deficit toward a lower goal weight as recomposition", () => {
    expect(inferGoal({ ...defaultProfile, currentWeightKg: 85, goalWeightKg: 78, deficitPercent: 10 })).toBe("recomp");
    expect(inferGoal({ ...defaultProfile, currentWeightKg: 85, goalWeightKg: 78, deficitPercent: 20 })).toBe("fat-loss");
  });
  it("reads a higher goal weight as muscle gain", () => {
    expect(inferGoal({ ...defaultProfile, currentWeightKg: 70, goalWeightKg: 76 })).toBe("muscle-gain");
  });
});

describe("buildCoachRequest", () => {
  it("emits one row per day, oldest first, and marks unlogged days", () => {
    const request = buildCoachRequest(
      {
        ...base,
        meals: [{ id: "m1", name: "Dal", loggedAt: "2026-09-12T13:00:00", calories: 500, proteinG: 25, carbsG: 60, fatG: 12, source: "manual" }],
        dailyByDate: { "2026-09-11": { creatineTaken: false, waterMl: 1500, steps: 8000, completedHabitIds: [] } },
        sessions: [{ id: "s1", dayId: "push", dayName: "Push", startedAt: "2026-09-12T09:00:00.000Z", endedAt: "2026-09-12T10:00:00.000Z" }],
      },
      7,
      "2026-09-13",
    );
    expect(request.days).toHaveLength(7);
    expect(request.days[0].date).toBe("2026-09-07");
    expect(request.days[6].date).toBe("2026-09-13");
    const sept12 = request.days.find((day) => day.date === "2026-09-12");
    expect(sept12).toMatchObject({ calories: 500, proteinG: 25, trained: true, logged: true });
    expect(request.days.find((day) => day.date === "2026-09-11")).toMatchObject({ logged: true, steps: 8000, calories: 0 });
    expect(request.days.find((day) => day.date === "2026-09-10")?.logged).toBe(false);
  });

  it("needs at least two logged days before a review is offered", () => {
    expect(hasEnoughForReview(buildCoachRequest(base, 7, "2026-09-13"))).toBe(false);
  });
});
