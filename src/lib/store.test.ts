import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBodyFitnessStore } from "@/lib/store";

describe("BodyFitness store", () => {
  beforeEach(() => {
    localStorage.clear();
    useBodyFitnessStore.getState().resetAll();
  });

  it("adds a meal and updates persisted state", () => {
    useBodyFitnessStore.getState().addMeal({
      name: "Dal rice",
      calories: 640,
      proteinG: 24,
      carbsG: 96,
      fatG: 17,
      source: "manual",
    });
    expect(useBodyFitnessStore.getState().meals[0]).toMatchObject({ name: "Dal rice", calories: 640 });
  });

  it("pauses and resumes a timestamp rest timer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T10:00:00Z"));
    useBodyFitnessStore.getState().startRestTimer("Bench Press", 120);
    vi.advanceTimersByTime(30_000);
    useBodyFitnessStore.getState().pauseRestTimer();
    expect(useBodyFitnessStore.getState().restTimer.pausedRemaining).toBe(90);
    useBodyFitnessStore.getState().resumeRestTimer();
    expect(useBodyFitnessStore.getState().restTimer.endsAt).toBe(Date.now() + 90_000);
    vi.useRealTimers();
  });

  it("records completed sets with an estimated max", () => {
    const log = useBodyFitnessStore.getState().logSet({
      dayId: "push",
      exerciseId: "bench-press",
      exerciseName: "Barbell Bench Press",
      setNumber: 1,
      weightKg: 60,
      reps: 8,
    });
    expect(log.e1rm).toBe(76);
    expect(useBodyFitnessStore.getState().setLogs).toHaveLength(1);
  });
});
