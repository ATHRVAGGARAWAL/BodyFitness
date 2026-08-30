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

  it("persists the selected appearance", () => {
    useBodyFitnessStore.getState().setThemePreference("light");
    expect(useBodyFitnessStore.getState().themePreference).toBe("light");
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

  it("opens a session on the first logged set and attaches later sets to it", () => {
    const first = useBodyFitnessStore.getState().logSet(benchSet(1));
    const second = useBodyFitnessStore.getState().logSet(benchSet(2));
    const state = useBodyFitnessStore.getState();

    expect(state.sessions).toHaveLength(1);
    expect(state.activeSessionId).toBe(first.sessionId);
    expect(second.sessionId).toBe(first.sessionId);
    expect(state.sessions[0]).toMatchObject({ dayId: "push", dayName: "Push", endedAt: null });
  });

  it("closes the open session when the athlete switches to another day", () => {
    useBodyFitnessStore.getState().logSet(benchSet(1));
    useBodyFitnessStore.getState().logSet({
      dayId: "legs",
      exerciseId: "back-squat",
      exerciseName: "Back Squat",
      setNumber: 1,
      weightKg: 90,
      reps: 6,
    });
    const state = useBodyFitnessStore.getState();

    expect(state.sessions).toHaveLength(2);
    expect(state.sessions.find((session) => session.dayId === "push")?.endedAt).not.toBeNull();
    expect(state.sessions.find((session) => session.dayId === "legs")?.endedAt).toBeNull();
  });

  it("finishes a session at the moment the athlete ends it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T09:00:00Z"));
    useBodyFitnessStore.getState().startSession("push");
    vi.setSystemTime(new Date("2026-08-19T10:08:00Z"));
    useBodyFitnessStore.getState().finishSession();

    const [session] = useBodyFitnessStore.getState().sessions;
    expect(session.endedAt).toBe("2026-08-19T10:08:00.000Z");
    expect(useBodyFitnessStore.getState().activeSessionId).toBeNull();
    vi.useRealTimers();
  });

  it("closes an abandoned session at its final set rather than leaving it open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T09:00:00Z"));
    useBodyFitnessStore.getState().logSet(benchSet(1));
    vi.setSystemTime(new Date("2026-08-19T18:00:00Z"));
    useBodyFitnessStore.getState().closeStaleSessions();

    const [session] = useBodyFitnessStore.getState().sessions;
    expect(session.endedAt).toBe("2026-08-19T09:00:00.000Z");
    expect(useBodyFitnessStore.getState().activeSessionId).toBeNull();
    vi.useRealTimers();
  });

  it("discards an in-progress session together with its sets", () => {
    useBodyFitnessStore.getState().logSet(benchSet(1));
    useBodyFitnessStore.getState().discardSession();
    const state = useBodyFitnessStore.getState();

    expect(state.sessions).toHaveLength(0);
    expect(state.setLogs).toHaveLength(0);
    expect(state.activeSessionId).toBeNull();
  });

  it("does not mark a first-ever set as a personal record", () => {
    const log = useBodyFitnessStore.getState().logSet(benchSet(1));
    expect(log.isPr).toBe(false);
  });
});

function benchSet(setNumber: number) {
  return {
    dayId: "push",
    exerciseId: "bench-press",
    exerciseName: "Barbell Bench Press",
    setNumber,
    weightKg: 60,
    reps: 8,
    restPrescribedSeconds: 120,
  };
}
