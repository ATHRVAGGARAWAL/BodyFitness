import { formatShortDate, localDateKey, shiftDate, startOfWeek } from "@/lib/date";
import type {
  ProgressPoint,
  SetLog,
  WeightEntry,
  WorkoutDay,
  WorkoutSession,
} from "@/lib/types";

/** A session left open this long without a logged set is closed at its last set. */
export const STALE_SESSION_MS = 3 * 60 * 60 * 1_000;

/** Allowance for the work performed after a rest ends, when judging set-to-set gaps. */
export const WORK_ALLOWANCE_SECONDS = 60;

/** Gaps longer than this are interruptions, not rest, and are excluded from adherence. */
export const REST_OUTLIER_SECONDS = 30 * 60;

export function sessionDurationMinutes(session: WorkoutSession) {
  if (!session.endedAt) return null;
  const elapsed = Date.parse(session.endedAt) - Date.parse(session.startedAt);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return null;
  return Math.round(elapsed / 60_000);
}

export function finishedSessions(sessions: WorkoutSession[]) {
  return sessions.filter((session) => session.endedAt !== null);
}

export function activeSession(sessions: WorkoutSession[], activeSessionId: string | null) {
  if (!activeSessionId) return null;
  return sessions.find((session) => session.id === activeSessionId && !session.endedAt) ?? null;
}

/** Newest set logged against a session, relying on `setLogs` being newest-first. */
export function lastActivityAt(sessionId: string, startedAt: string, setLogs: SetLog[]) {
  return setLogs.find((log) => log.sessionId === sessionId)?.completedAt ?? startedAt;
}

export function averageSessionMinutes(sessions: WorkoutSession[], sampleSize = 10) {
  const durations = finishedSessions(sessions)
    .slice(0, sampleSize)
    .map(sessionDurationMinutes)
    .filter((value): value is number => value !== null);
  if (!durations.length) return null;
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

export interface CycleProgress {
  planned: number;
  completed: number;
  completedDayIds: string[];
}

/** Which of the plan's days have been trained in the current week. */
export function weeklyCycle(
  sessions: WorkoutSession[],
  plan: WorkoutDay[],
  weekStart = startOfWeek(),
): CycleProgress {
  const weekEnd = shiftDate(weekStart, 7);
  const trained = new Set<string>();
  for (const session of finishedSessions(sessions)) {
    const date = localDateKey(session.startedAt);
    if (date >= weekStart && date < weekEnd) trained.add(session.dayId);
  }
  const completedDayIds = plan.map((day) => day.id).filter((id) => trained.has(id));
  return { planned: plan.length, completed: completedDayIds.length, completedDayIds };
}

export interface RestAdherence {
  /** Share of rests landing inside the prescribed window, or null below the sample floor. */
  score: number | null;
  observations: number;
  medianSeconds: number | null;
}

interface RestObservation {
  targetSeconds: number;
  actualSeconds: number;
}

/**
 * Pairs each set carrying a rest prescription with the next set in the same session,
 * treating the gap between them as the rest actually taken.
 */
export function restObservations(setLogs: SetLog[]): RestObservation[] {
  const bySession = new Map<string, SetLog[]>();
  for (const log of setLogs) {
    if (!log.sessionId) continue;
    const bucket = bySession.get(log.sessionId);
    if (bucket) bucket.push(log);
    else bySession.set(log.sessionId, [log]);
  }

  const observations: RestObservation[] = [];
  for (const logs of bySession.values()) {
    const ordered = [...logs].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const targetSeconds = ordered[index].restPrescribedSeconds;
      if (!targetSeconds || targetSeconds <= 0) continue;
      const gap = Date.parse(ordered[index + 1].completedAt) - Date.parse(ordered[index].completedAt);
      if (!Number.isFinite(gap) || gap <= 0) continue;
      const actualSeconds = Math.round(gap / 1_000);
      if (actualSeconds > REST_OUTLIER_SECONDS) continue;
      observations.push({ targetSeconds, actualSeconds });
    }
  }
  return observations;
}

export function restAdherence(setLogs: SetLog[], minimumObservations = 3): RestAdherence {
  const observations = restObservations(setLogs);
  if (observations.length < minimumObservations) {
    return { score: null, observations: observations.length, medianSeconds: null };
  }

  const onTarget = observations.filter(
    (item) =>
      item.actualSeconds >= item.targetSeconds &&
      item.actualSeconds <= item.targetSeconds + WORK_ALLOWANCE_SECONDS,
  ).length;
  const sorted = observations.map((item) => item.actualSeconds).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return {
    score: Math.round((onTarget / observations.length) * 100),
    observations: observations.length,
    medianSeconds:
      sorted.length % 2 === 1
        ? sorted[middle]
        : Math.round((sorted[middle - 1] + sorted[middle]) / 2),
  };
}

export function sessionVolumeKg(sessionId: string, setLogs: SetLog[]) {
  return setLogs
    .filter((log) => log.sessionId === sessionId)
    .reduce((total, log) => total + log.weightKg * log.reps, 0);
}

export interface Delta {
  value: number | null;
  spanDays: number;
}

const EMPTY_DELTA: Delta = { value: null, spanDays: 0 };

function daysBetween(fromDateKey: string, toDateKey: string) {
  const elapsed = Date.parse(`${toDateKey}T12:00:00`) - Date.parse(`${fromDateKey}T12:00:00`);
  return Math.max(0, Math.round(elapsed / 86_400_000));
}

/** Absolute body-weight change across the window, using the outermost measurements in it. */
export function weightDelta(
  entries: WeightEntry[],
  weeks = 8,
  today = localDateKey(),
): Delta {
  const windowStart = shiftDate(today, -weeks * 7);
  const inWindow = entries
    .filter((entry) => entry.date >= windowStart && entry.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (inWindow.length < 2) return EMPTY_DELTA;

  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  return {
    value: Number((last.weightKg - first.weightKg).toFixed(1)),
    spanDays: daysBetween(first.date, last.date),
  };
}

/** Percentage change in best e1RM for a lift, comparing its first and last recorded day. */
export function strengthDeltaPercent(
  setLogs: SetLog[],
  exerciseId: string | undefined,
  weeks = 12,
  today = localDateKey(),
): Delta {
  if (!exerciseId) return EMPTY_DELTA;
  const windowStart = shiftDate(today, -weeks * 7);

  const bestByDate = new Map<string, number>();
  for (const log of setLogs) {
    if (log.exerciseId !== exerciseId) continue;
    const date = localDateKey(log.completedAt);
    if (date < windowStart || date > today) continue;
    bestByDate.set(date, Math.max(bestByDate.get(date) ?? 0, log.e1rm));
  }

  const dates = [...bestByDate.keys()].sort();
  if (dates.length < 2) return EMPTY_DELTA;

  const first = bestByDate.get(dates[0]) ?? 0;
  const last = bestByDate.get(dates[dates.length - 1]) ?? 0;
  if (first <= 0) return EMPTY_DELTA;

  return {
    value: Number(((last / first - 1) * 100).toFixed(1)),
    spanDays: daysBetween(dates[0], dates[dates.length - 1]),
  };
}

export function formatSpan(spanDays: number) {
  if (spanDays >= 14) return `${Math.round(spanDays / 7)}wk`;
  return `${spanDays}d`;
}

export function formatDelta(delta: Delta, unit: string) {
  if (delta.value === null) return null;
  const sign = delta.value > 0 ? "+" : delta.value < 0 ? "−" : "";
  return `${sign}${Math.abs(delta.value)}${unit} / ${formatSpan(delta.spanDays)}`;
}

export type BodySignal = "recomp" | "cut" | "gain" | "hold";

/** Reads body-mass direction against strength direction. Null until both are measurable. */
export function bodySignal(weight: Delta, strength: Delta): BodySignal | null {
  if (weight.value === null || strength.value === null) return null;
  const weightDown = weight.value <= -0.5;
  const weightUp = weight.value >= 0.5;
  const strengthUp = strength.value >= 1;
  const strengthDown = strength.value <= -1;

  if (weightDown && strengthUp) return "recomp";
  if (weightDown && !strengthDown) return "cut";
  if (weightUp && strengthUp) return "gain";
  return "hold";
}

export const bodySignalCopy: Record<BodySignal, { title: string; detail: string }> = {
  recomp: {
    title: "Recomposition signal",
    detail: "Body mass is trending down while strength trends up.",
  },
  cut: {
    title: "Deficit signal",
    detail: "Body mass is trending down and strength is holding.",
  },
  gain: {
    title: "Accumulation signal",
    detail: "Body mass and strength are both trending up.",
  },
  hold: {
    title: "Maintenance signal",
    detail: "Body mass and strength are both broadly flat.",
  },
};

/**
 * Weekly series with `null` for weeks that hold no measurement, so gaps stay visible
 * instead of being filled with invented values.
 */
export function buildProgressSeries(
  weightEntries: WeightEntry[],
  setLogs: SetLog[],
  exerciseId: string | undefined,
  weeks = 12,
  today = localDateKey(),
): ProgressPoint[] {
  return Array.from({ length: weeks }, (_, index) => {
    const weekDate = shiftDate(today, -(weeks - 1 - index) * 7);
    const week = startOfWeek(new Date(`${weekDate}T12:00:00`));
    const nextWeek = shiftDate(week, 7);

    const weights = weightEntries
      .filter((entry) => entry.date >= week && entry.date < nextWeek)
      .map((entry) => entry.weightKg);
    const lifts = setLogs
      .filter((log) => {
        if (log.exerciseId !== exerciseId) return false;
        const date = localDateKey(log.completedAt);
        return date >= week && date < nextWeek;
      })
      .map((log) => log.e1rm);

    return {
      date: week,
      week: formatShortDate(week),
      weight: weights.length
        ? Number((weights.reduce((sum, value) => sum + value, 0) / weights.length).toFixed(1))
        : null,
      e1rm: lifts.length ? Number(Math.max(...lifts).toFixed(1)) : null,
    };
  });
}
