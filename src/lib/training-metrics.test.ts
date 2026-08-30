import { describe, expect, it } from "vitest";
import {
  averageSessionMinutes,
  bodySignal,
  buildProgressSeries,
  formatDelta,
  restAdherence,
  sessionDurationMinutes,
  strengthDeltaPercent,
  weeklyCycle,
  weightDelta,
} from "@/lib/training-metrics";
import type { SetLog, WeightEntry, WorkoutDay, WorkoutSession } from "@/lib/types";

const plan = [
  { id: "push", name: "Push", accent: "#ff668a", exercises: [] },
  { id: "pull", name: "Pull", accent: "#65d9ff", exercises: [] },
  { id: "legs", name: "Legs", accent: "#ffbd59", exercises: [] },
] satisfies WorkoutDay[];

function session(overrides: Partial<WorkoutSession> & Pick<WorkoutSession, "id">): WorkoutSession {
  return {
    dayId: "push",
    dayName: "Push",
    startedAt: "2026-08-19T09:00:00.000Z",
    endedAt: "2026-08-19T10:00:00.000Z",
    ...overrides,
  };
}

function setLog(overrides: Partial<SetLog> & Pick<SetLog, "id">): SetLog {
  return {
    dayId: "push",
    exerciseId: "bench-press",
    exerciseName: "Barbell Bench Press",
    setNumber: 1,
    weightKg: 60,
    reps: 8,
    e1rm: 76,
    completedAt: "2026-08-19T09:05:00.000Z",
    isPr: false,
    ...overrides,
  };
}

describe("sessionDurationMinutes", () => {
  it("returns null while a session is still open", () => {
    expect(sessionDurationMinutes(session({ id: "a", endedAt: null }))).toBeNull();
  });

  it("reports whole minutes between start and end", () => {
    expect(
      sessionDurationMinutes(
        session({ id: "a", startedAt: "2026-08-19T09:00:00.000Z", endedAt: "2026-08-19T10:08:20.000Z" }),
      ),
    ).toBe(68);
    expect(
      sessionDurationMinutes(
        session({ id: "a", startedAt: "2026-08-19T09:00:00.000Z", endedAt: "2026-08-19T10:08:40.000Z" }),
      ),
    ).toBe(69);
  });
});

describe("averageSessionMinutes", () => {
  it("is null until at least one session has finished", () => {
    expect(averageSessionMinutes([session({ id: "a", endedAt: null })])).toBeNull();
  });

  it("averages finished sessions and ignores open ones", () => {
    const average = averageSessionMinutes([
      session({ id: "a", startedAt: "2026-08-19T09:00:00.000Z", endedAt: "2026-08-19T10:00:00.000Z" }),
      session({ id: "b", startedAt: "2026-08-18T09:00:00.000Z", endedAt: "2026-08-18T10:30:00.000Z" }),
      session({ id: "c", endedAt: null }),
    ]);
    expect(average).toBe(75);
  });
});

describe("weeklyCycle", () => {
  const weekStart = "2026-08-17";

  it("counts each plan day at most once", () => {
    const cycle = weeklyCycle(
      [
        session({ id: "a", dayId: "push", startedAt: "2026-08-17T09:00:00.000Z", endedAt: "2026-08-17T10:00:00.000Z" }),
        session({ id: "b", dayId: "push", startedAt: "2026-08-19T09:00:00.000Z", endedAt: "2026-08-19T10:00:00.000Z" }),
        session({ id: "c", dayId: "legs", startedAt: "2026-08-20T09:00:00.000Z", endedAt: "2026-08-20T10:00:00.000Z" }),
      ],
      plan,
      weekStart,
    );
    expect(cycle).toEqual({ planned: 3, completed: 2, completedDayIds: ["push", "legs"] });
  });

  it("excludes sessions outside the week and sessions still open", () => {
    const cycle = weeklyCycle(
      [
        session({ id: "a", dayId: "push", startedAt: "2026-08-10T09:00:00.000Z", endedAt: "2026-08-10T10:00:00.000Z" }),
        session({ id: "b", dayId: "pull", startedAt: "2026-08-19T09:00:00.000Z", endedAt: null }),
      ],
      plan,
      weekStart,
    );
    expect(cycle.completed).toBe(0);
  });
});

describe("restAdherence", () => {
  function restPair(index: number, gapSeconds: number, targetSeconds = 120): SetLog[] {
    const base = Date.parse("2026-08-19T09:00:00.000Z") + index * 3_600_000;
    return [
      setLog({
        id: `a${index}`,
        sessionId: `session-${index}`,
        restPrescribedSeconds: targetSeconds,
        completedAt: new Date(base).toISOString(),
      }),
      setLog({
        id: `b${index}`,
        sessionId: `session-${index}`,
        setNumber: 2,
        completedAt: new Date(base + gapSeconds * 1_000).toISOString(),
      }),
    ];
  }

  it("stays null below the sample floor", () => {
    const result = restAdherence([...restPair(0, 130), ...restPair(1, 140)]);
    expect(result.score).toBeNull();
    expect(result.observations).toBe(2);
  });

  it("counts a rest inside the prescribed window as on target", () => {
    const result = restAdherence([...restPair(0, 130), ...restPair(1, 150), ...restPair(2, 170)]);
    expect(result.observations).toBe(3);
    expect(result.score).toBe(100);
    expect(result.medianSeconds).toBe(150);
  });

  it("penalises rests that undershoot or overshoot the window", () => {
    const result = restAdherence([...restPair(0, 60), ...restPair(1, 130), ...restPair(2, 400)]);
    expect(result.score).toBe(33);
  });

  it("discards gaps long enough to be an interruption", () => {
    const result = restAdherence([...restPair(0, 130), ...restPair(1, 140), ...restPair(2, 4_000)]);
    expect(result.observations).toBe(2);
  });

  it("never pairs sets across two different sessions", () => {
    const first = Date.parse("2026-08-19T09:00:00.000Z");
    const logs = [
      setLog({ id: "a", sessionId: "one", restPrescribedSeconds: 120, completedAt: new Date(first).toISOString() }),
      setLog({ id: "b", sessionId: "two", completedAt: new Date(first + 130_000).toISOString() }),
    ];
    expect(restAdherence(logs, 1).observations).toBe(0);
  });
});

describe("weightDelta", () => {
  const entries: WeightEntry[] = [
    { id: "1", date: "2026-08-22", weightKg: 83.4 },
    { id: "2", date: "2026-08-01", weightKg: 85 },
  ];

  it("needs two measurements before reporting a trend", () => {
    expect(weightDelta([entries[0]], 8, "2026-08-24").value).toBeNull();
  });

  it("reports the change across the measured span", () => {
    expect(weightDelta(entries, 8, "2026-08-24")).toEqual({ value: -1.6, spanDays: 21 });
  });

  it("ignores measurements older than the window", () => {
    const stale: WeightEntry[] = [{ id: "3", date: "2026-01-01", weightKg: 95 }, entries[0]];
    expect(weightDelta(stale, 8, "2026-08-24").value).toBeNull();
  });
});

describe("strengthDeltaPercent", () => {
  it("needs two distinct training days", () => {
    const logs = [setLog({ id: "a", completedAt: "2026-08-19T09:00:00.000Z" })];
    expect(strengthDeltaPercent(logs, "bench-press", 12, "2026-08-24").value).toBeNull();
  });

  it("compares the best effort on the first and last recorded day", () => {
    const logs = [
      setLog({ id: "a", e1rm: 80, completedAt: "2026-08-21T09:00:00.000Z" }),
      setLog({ id: "b", e1rm: 76, completedAt: "2026-08-21T09:20:00.000Z" }),
      setLog({ id: "c", e1rm: 76, completedAt: "2026-08-07T09:00:00.000Z" }),
    ];
    const delta = strengthDeltaPercent(logs, "bench-press", 12, "2026-08-24");
    expect(delta.value).toBeCloseTo(5.3, 1);
    expect(delta.spanDays).toBe(14);
  });
});

describe("bodySignal", () => {
  it("is null until both trends are measurable", () => {
    expect(bodySignal({ value: null, spanDays: 0 }, { value: 4, spanDays: 30 })).toBeNull();
  });

  it("reads falling mass against rising strength as recomposition", () => {
    expect(bodySignal({ value: -1.6, spanDays: 56 }, { value: 4, spanDays: 84 })).toBe("recomp");
  });

  it("reads rising mass against rising strength as accumulation", () => {
    expect(bodySignal({ value: 1.2, spanDays: 56 }, { value: 4, spanDays: 84 })).toBe("gain");
  });
});

describe("formatDelta", () => {
  it("returns null when there is nothing to report", () => {
    expect(formatDelta({ value: null, spanDays: 0 }, " kg")).toBeNull();
  });

  it("uses a typographic minus and a readable span", () => {
    expect(formatDelta({ value: -1.6, spanDays: 21 }, " kg")).toBe("−1.6 kg / 3wk");
    expect(formatDelta({ value: 8.4, spanDays: 5 }, "%")).toBe("+8.4% / 5d");
  });
});

describe("buildProgressSeries", () => {
  it("leaves weeks without measurements empty instead of inventing them", () => {
    const series = buildProgressSeries(
      [{ id: "1", date: "2026-08-19", weightKg: 84 }],
      [setLog({ id: "a", e1rm: 80, completedAt: "2026-08-19T09:00:00.000Z" })],
      "bench-press",
      12,
      "2026-08-24",
    );
    expect(series).toHaveLength(12);
    const populated = series.filter((point) => point.weight !== null || point.e1rm !== null);
    expect(populated).toHaveLength(1);
    expect(populated[0]).toMatchObject({ weight: 84, e1rm: 80 });
    expect(series.filter((point) => point.weight === null)).toHaveLength(11);
  });

  it("ignores lifts that are not the selected exercise", () => {
    const series = buildProgressSeries(
      [],
      [setLog({ id: "a", exerciseId: "back-squat", e1rm: 120, completedAt: "2026-08-19T09:00:00.000Z" })],
      "bench-press",
      12,
      "2026-08-24",
    );
    expect(series.every((point) => point.e1rm === null)).toBe(true);
  });
});
