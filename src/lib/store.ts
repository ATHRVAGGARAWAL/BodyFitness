"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { calculateTargets, epley1Rm, isProgressiveOverload } from "@/lib/calculations";
import { localDateKey } from "@/lib/date";
import { lastActivityAt, STALE_SESSION_MS } from "@/lib/training-metrics";
import {
  defaultHabits,
  defaultProfile,
  defaultTargets,
  defaultWorkoutPlan,
} from "@/lib/seed";
import type {
  AccountState,
  AppProfile,
  CircleFeed,
  DailyWellness,
  Habit,
  HealthSource,
  MealEntry,
  NutritionTargets,
  PhysiqueWeek,
  RestTimerState,
  SetLog,
  SharingPolicy,
  SyncRecord,
  ThemePreference,
  UserProfile,
  WeightEntry,
  WorkoutDay,
  WorkoutSession,
} from "@/lib/types";
import { uid } from "@/lib/utils";

const emptyRestTimer: RestTimerState = {
  exerciseName: "",
  durationSeconds: 0,
  endsAt: null,
  pausedRemaining: null,
};

const emptyDaily = (): DailyWellness => ({
  creatineTaken: false,
  waterMl: 0,
  steps: 0,
  stepSource: "manual",
  manualStepOverride: false,
  completedHabitIds: [],
});

const defaultSharing: SharingPolicy = {
  achievements: true,
  goalProgress: true,
  exactSteps: false,
  workoutSummaries: false,
  personalRecords: false,
  nutrition: false,
  weight: false,
};

const defaultAccountProfile: AppProfile = {
  displayName: "Athlete",
  handle: "athlete_local",
  birthDate: null,
  timezone: "UTC",
  primaryStepSource: null,
};

const emptyCircle: CircleFeed = {
  members: [],
  pendingInvites: 0,
  generatedAt: "1970-01-01T00:00:00.000Z",
};

const emptyAccount = (): AccountState => ({
  profile: { ...defaultAccountProfile },
  sharingDefaults: { ...defaultSharing },
  circle: { ...emptyCircle, members: [] },
  achievements: [],
  connections: [],
  syncRecords: [],
  deviceId: uid("device"),
  syncCursor: null,
  lastSyncedAt: null,
  syncStatus: "local",
  syncError: null,
});

interface StoreData {
  hydrated: boolean;
  themePreference: ThemePreference;
  onboardingComplete: boolean;
  profile: UserProfile;
  targets: NutritionTargets;
  meals: MealEntry[];
  dailyByDate: Record<string, DailyWellness>;
  flexDays: string[];
  habits: Habit[];
  workoutPlan: WorkoutDay[];
  sessions: WorkoutSession[];
  activeSessionId: string | null;
  setLogs: SetLog[];
  restDefaults: { compound: number; isolation: number };
  restTimer: RestTimerState;
  weightEntries: WeightEntry[];
  physiqueWeeks: PhysiqueWeek[];
  selectedLiftId: string;
  account: AccountState;
}

interface StoreActions {
  setHydrated: (hydrated: boolean) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  finishOnboarding: (profile: UserProfile) => void;
  updateProfile: (profile: UserProfile) => void;
  recalculateTargets: () => void;
  addMeal: (meal: Omit<MealEntry, "id" | "loggedAt"> & { loggedAt?: string }) => void;
  removeMeal: (id: string) => void;
  toggleFlexDay: (dateKey: string) => void;
  setCreatine: (taken: boolean, dateKey?: string) => void;
  addWater: (deltaMl: number, dateKey?: string) => void;
  setSteps: (steps: number, dateKey?: string) => void;
  setSyncedSteps: (
    steps: number,
    source: Exclude<HealthSource, "manual">,
    syncedAt?: string,
    dateKey?: string,
  ) => void;
  clearManualStepOverride: (dateKey?: string) => void;
  toggleHabit: (habitId: string, dateKey?: string) => void;
  addHabit: (label: string) => void;
  removeHabit: (id: string) => void;
  setWorkoutPlan: (plan: WorkoutDay[]) => void;
  setRestDefaults: (defaults: { compound: number; isolation: number }) => void;
  startSession: (dayId: string) => WorkoutSession | null;
  finishSession: () => void;
  discardSession: () => void;
  closeStaleSessions: (now?: number) => void;
  logSet: (input: {
    dayId: string;
    exerciseId: string;
    exerciseName: string;
    setNumber: number;
    weightKg: number;
    reps: number;
    restPrescribedSeconds?: number;
  }) => SetLog;
  startRestTimer: (exerciseName: string, durationSeconds: number) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  addRestTime: (seconds: number) => void;
  clearRestTimer: () => void;
  addWeightEntry: (weightKg: number, date?: string) => void;
  addPhysiqueWeek: (entry: Omit<PhysiqueWeek, "id">) => string;
  updatePhysiqueWeek: (id: string, patch: Partial<PhysiqueWeek>) => void;
  setSelectedLiftId: (id: string) => void;
  setAccountProfile: (profile: Partial<AppProfile>) => void;
  setSharingDefaults: (sharing: SharingPolicy) => void;
  setCircle: (circle: CircleFeed) => void;
  setSyncStatus: (
    status: AccountState["syncStatus"],
    options?: { syncedAt?: string | null; cursor?: string | null; error?: string | null },
  ) => void;
  applySyncRecords: (records: SyncRecord[]) => void;
  resetAll: () => void;
}

export type BodyFitnessStore = StoreData & StoreActions;

const initialData = (): StoreData => ({
  hydrated: false,
  themePreference: "system",
  onboardingComplete: false,
  profile: { ...defaultProfile },
  targets: { ...defaultTargets },
  meals: [],
  dailyByDate: {},
  flexDays: [],
  habits: defaultHabits.map((habit) => ({ ...habit })),
  workoutPlan: defaultWorkoutPlan.map((day) => ({
    ...day,
    exercises: day.exercises.map((exercise) => ({ ...exercise })),
  })),
  sessions: [],
  activeSessionId: null,
  setLogs: [],
  restDefaults: { compound: 120, isolation: 90 },
  restTimer: { ...emptyRestTimer },
  weightEntries: [],
  physiqueWeeks: [],
  selectedLiftId: "bench-press",
  account: emptyAccount(),
});

function closeSession(session: WorkoutSession, setLogs: SetLog[]): WorkoutSession {
  return { ...session, endedAt: lastActivityAt(session.id, session.startedAt, setLogs) };
}

/**
 * Returns the session a set should attach to, opening one when the athlete logged
 * without starting a session, or rolling over when the previous one is stale or for
 * a different day.
 */
function ensureActiveSession(
  state: BodyFitnessStore,
  dayId: string,
  at: string,
): { sessions: WorkoutSession[]; activeSessionId: string } {
  const current = state.sessions.find(
    (session) => session.id === state.activeSessionId && !session.endedAt,
  );

  if (current && current.dayId === dayId) {
    const idle =
      Date.parse(at) -
      Date.parse(lastActivityAt(current.id, current.startedAt, state.setLogs));
    if (idle < STALE_SESSION_MS) {
      return { sessions: state.sessions, activeSessionId: current.id };
    }
  }

  const opened: WorkoutSession = {
    id: uid("session"),
    dayId,
    dayName: state.workoutPlan.find((day) => day.id === dayId)?.name ?? dayId,
    startedAt: at,
    endedAt: null,
  };
  const sessions = current
    ? [opened, ...state.sessions.map((session) => (session.id === current.id ? closeSession(session, state.setLogs) : session))]
    : [opened, ...state.sessions];

  return { sessions, activeSessionId: opened.id };
}

function withDaily(
  state: BodyFitnessStore,
  dateKey: string,
  update: (daily: DailyWellness) => DailyWellness,
) {
  const current = state.dailyByDate[dateKey] ?? emptyDaily();
  return {
    dailyByDate: {
      ...state.dailyByDate,
      [dateKey]: update(current),
    },
  };
}

export const useBodyFitnessStore = create<BodyFitnessStore>()(
  persist(
    (set, get) => ({
      ...initialData(),
      setHydrated: (hydrated) => set({ hydrated }),
      setThemePreference: (themePreference) => set({ themePreference }),
      finishOnboarding: (profile) =>
        set({
          profile,
          targets: calculateTargets(profile),
          onboardingComplete: true,
        }),
      updateProfile: (profile) => set({ profile }),
      recalculateTargets: () =>
        set((state) => ({ targets: calculateTargets(state.profile) })),
      addMeal: (meal) =>
        set((state) => ({
          meals: [
            {
              ...meal,
              id: uid("meal"),
              loggedAt: meal.loggedAt ?? new Date().toISOString(),
            },
            ...state.meals,
          ],
        })),
      removeMeal: (id) =>
        set((state) => ({ meals: state.meals.filter((meal) => meal.id !== id) })),
      toggleFlexDay: (dateKey) =>
        set((state) => ({
          flexDays: state.flexDays.includes(dateKey)
            ? state.flexDays.filter((date) => date !== dateKey)
            : [...state.flexDays, dateKey],
        })),
      setCreatine: (taken, dateKey = localDateKey()) =>
        set((state) => withDaily(state, dateKey, (daily) => ({ ...daily, creatineTaken: taken }))),
      addWater: (deltaMl, dateKey = localDateKey()) =>
        set((state) =>
          withDaily(state, dateKey, (daily) => ({
            ...daily,
            waterMl: Math.min(4_000, Math.max(0, daily.waterMl + deltaMl)),
          })),
        ),
      setSteps: (steps, dateKey = localDateKey()) =>
        set((state) =>
          withDaily(state, dateKey, (daily) => ({
            ...daily,
            steps: Math.max(0, Math.round(steps)),
            stepSource: "manual",
            stepSyncedAt: new Date().toISOString(),
            manualStepOverride: true,
          })),
        ),
      setSyncedSteps: (steps, source, syncedAt = new Date().toISOString(), dateKey = localDateKey()) =>
        set((state) =>
          withDaily(state, dateKey, (daily) =>
            daily.manualStepOverride
              ? { ...daily, stepSyncedAt: syncedAt }
              : {
                  ...daily,
                  steps: Math.max(0, Math.round(steps)),
                  stepSource: source,
                  stepSyncedAt: syncedAt,
                  manualStepOverride: false,
                },
          ),
        ),
      clearManualStepOverride: (dateKey = localDateKey()) =>
        set((state) =>
          withDaily(state, dateKey, (daily) => ({
            ...daily,
            manualStepOverride: false,
            stepSource: daily.stepSource === "manual" ? "cloud" : daily.stepSource,
          })),
        ),
      toggleHabit: (habitId, dateKey = localDateKey()) =>
        set((state) =>
          withDaily(state, dateKey, (daily) => ({
            ...daily,
            completedHabitIds: daily.completedHabitIds.includes(habitId)
              ? daily.completedHabitIds.filter((id) => id !== habitId)
              : [...daily.completedHabitIds, habitId],
          })),
        ),
      addHabit: (label) =>
        set((state) => ({ habits: [...state.habits, { id: uid("habit"), label }] })),
      removeHabit: (id) =>
        set((state) => ({ habits: state.habits.filter((habit) => habit.id !== id) })),
      setWorkoutPlan: (workoutPlan) => set({ workoutPlan }),
      setRestDefaults: (restDefaults) => set({ restDefaults }),
      startSession: (dayId) => {
        const state = get();
        const day = state.workoutPlan.find((entry) => entry.id === dayId);
        if (!day) return null;
        const existing = state.sessions.find(
          (session) => session.id === state.activeSessionId && !session.endedAt,
        );
        if (existing && existing.dayId === dayId) return existing;

        const opened: WorkoutSession = {
          id: uid("session"),
          dayId,
          dayName: day.name,
          startedAt: new Date().toISOString(),
          endedAt: null,
        };
        set({
          sessions: [
            opened,
            ...state.sessions.map((session) =>
              existing && session.id === existing.id ? closeSession(session, state.setLogs) : session,
            ),
          ],
          activeSessionId: opened.id,
        });
        return opened;
      },
      finishSession: () =>
        set((state) => {
          if (!state.activeSessionId) return {};
          const endedAt = new Date().toISOString();
          return {
            sessions: state.sessions.map((session) =>
              session.id === state.activeSessionId && !session.endedAt
                ? { ...session, endedAt }
                : session,
            ),
            activeSessionId: null,
          };
        }),
      discardSession: () =>
        set((state) => {
          if (!state.activeSessionId) return {};
          const discarded = state.activeSessionId;
          return {
            sessions: state.sessions.filter((session) => session.id !== discarded),
            setLogs: state.setLogs.filter((log) => log.sessionId !== discarded),
            activeSessionId: null,
          };
        }),
      closeStaleSessions: (now = Date.now()) =>
        set((state) => {
          const stale = state.sessions.filter(
            (session) =>
              !session.endedAt &&
              now - Date.parse(lastActivityAt(session.id, session.startedAt, state.setLogs)) >=
                STALE_SESSION_MS,
          );
          if (!stale.length) return {};
          const staleIds = new Set(stale.map((session) => session.id));
          return {
            sessions: state.sessions.map((session) =>
              staleIds.has(session.id) ? closeSession(session, state.setLogs) : session,
            ),
            activeSessionId:
              state.activeSessionId && staleIds.has(state.activeSessionId)
                ? null
                : state.activeSessionId,
          };
        }),
      logSet: (input) => {
        const state = get();
        const completedAt = new Date().toISOString();
        const { sessions, activeSessionId } = ensureActiveSession(state, input.dayId, completedAt);
        const previous = state.setLogs.find(
          (log) =>
            log.exerciseId === input.exerciseId && log.setNumber === input.setNumber,
        );
        const log: SetLog = {
          ...input,
          id: uid("set"),
          sessionId: activeSessionId,
          completedAt,
          e1rm: Number(epley1Rm(input.weightKg, input.reps).toFixed(1)),
          isPr: isProgressiveOverload(input, previous),
        };
        set({ setLogs: [log, ...state.setLogs], sessions, activeSessionId });
        return log;
      },
      startRestTimer: (exerciseName, durationSeconds) =>
        set({
          restTimer: {
            exerciseName,
            durationSeconds,
            endsAt: Date.now() + durationSeconds * 1_000,
            pausedRemaining: null,
          },
        }),
      pauseRestTimer: () =>
        set((state) => {
          if (!state.restTimer.endsAt) return {};
          return {
            restTimer: {
              ...state.restTimer,
              endsAt: null,
              pausedRemaining: Math.max(
                0,
                Math.ceil((state.restTimer.endsAt - Date.now()) / 1_000),
              ),
            },
          };
        }),
      resumeRestTimer: () =>
        set((state) => {
          if (state.restTimer.pausedRemaining === null) return {};
          return {
            restTimer: {
              ...state.restTimer,
              endsAt: Date.now() + state.restTimer.pausedRemaining * 1_000,
              pausedRemaining: null,
            },
          };
        }),
      addRestTime: (seconds) =>
        set((state) => ({
          restTimer: {
            ...state.restTimer,
            endsAt: state.restTimer.endsAt
              ? state.restTimer.endsAt + seconds * 1_000
              : null,
            pausedRemaining:
              state.restTimer.pausedRemaining !== null
                ? state.restTimer.pausedRemaining + seconds
                : null,
            durationSeconds: state.restTimer.durationSeconds + seconds,
          },
        })),
      clearRestTimer: () => set({ restTimer: { ...emptyRestTimer } }),
      addWeightEntry: (weightKg, date = localDateKey()) =>
        set((state) => ({
          weightEntries: [
            { id: uid("weight"), date, weightKg },
            ...state.weightEntries.filter((entry) => entry.date !== date),
          ],
        })),
      addPhysiqueWeek: (entry) => {
        const id = uid("physique");
        set((state) => ({ physiqueWeeks: [{ ...entry, id }, ...state.physiqueWeeks] }));
        return id;
      },
      updatePhysiqueWeek: (id, patch) =>
        set((state) => ({
          physiqueWeeks: state.physiqueWeeks.map((entry) =>
            entry.id === id ? { ...entry, ...patch } : entry,
          ),
        })),
      setSelectedLiftId: (selectedLiftId) => set({ selectedLiftId }),
      setAccountProfile: (profile) =>
        set((state) => ({
          account: { ...state.account, profile: { ...state.account.profile, ...profile } },
        })),
      setSharingDefaults: (sharingDefaults) =>
        set((state) => ({ account: { ...state.account, sharingDefaults } })),
      setCircle: (circle) =>
        set((state) => ({
          account: {
            ...state.account,
            circle,
            connections: circle.members.map((member) => member.connection),
            achievements: circle.members.flatMap((member) => member.achievements),
          },
        })),
      setSyncStatus: (syncStatus, options = {}) =>
        set((state) => ({
          account: {
            ...state.account,
            syncStatus,
            lastSyncedAt: options.syncedAt === undefined ? state.account.lastSyncedAt : options.syncedAt,
            syncCursor: options.cursor === undefined ? state.account.syncCursor : options.cursor,
            syncError: options.error === undefined ? state.account.syncError : options.error,
          },
        })),
      applySyncRecords: (incoming) =>
        set((state) => {
          const canonical = new Map(state.account.syncRecords.map((item) => [`${item.entity}:${item.entityId}`, item]));
          let profile = state.profile;
          let targets = state.targets;
          let workoutPlan = state.workoutPlan;
          let sessions = state.sessions;
          let meals = state.meals;
          let dailyByDate = state.dailyByDate;
          let setLogs = state.setLogs;
          let weightEntries = state.weightEntries;
          let themePreference = state.themePreference;
          let habits = state.habits;
          let flexDays = state.flexDays;
          let restDefaults = state.restDefaults;
          let sharingDefaults = state.account.sharingDefaults;
          let selectedLiftId = state.selectedLiftId;
          let accountProfile = state.account.profile;

          for (const item of incoming) {
            const key = `${item.entity}:${item.entityId}`;
            const current = canonical.get(key);
            if (current && current.revision > item.revision) continue;
            canonical.set(key, item);
            if (item.deletedAt) continue;
            const payload = item.payload;
            if (item.entity === "profile") {
              if (isUserProfile(payload)) profile = payload;
              const candidate = isObject(payload.account) ? payload.account : payload;
              if (isAppProfile(candidate)) accountProfile = candidate;
            } else if (item.entity === "targets" && isNutritionTargets(payload)) {
              targets = payload;
            } else if (item.entity === "workout-plan" && Array.isArray(payload.days)) {
              workoutPlan = payload.days as WorkoutDay[];
            } else if (item.entity === "settings") {
              if (payload.themePreference === "system" || payload.themePreference === "light" || payload.themePreference === "dark") themePreference = payload.themePreference;
              if (Array.isArray(payload.habits)) habits = payload.habits as Habit[];
              if (Array.isArray(payload.flexDays)) flexDays = payload.flexDays.filter((value): value is string => typeof value === "string");
              if (isRestDefaults(payload.restDefaults)) restDefaults = payload.restDefaults;
              if (isSharingPolicy(payload.sharingDefaults)) sharingDefaults = payload.sharingDefaults;
              if (typeof payload.selectedLiftId === "string") selectedLiftId = payload.selectedLiftId;
            } else if (item.entity === "meal" && isMealEntry(payload)) {
              meals = [payload, ...meals.filter((entry) => entry.id !== payload.id)].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
            } else if (item.entity === "daily-wellness") {
              const date = typeof payload.date === "string" ? payload.date : item.entityId;
              dailyByDate = { ...dailyByDate, [date]: {
                creatineTaken: Boolean(payload.creatineTaken),
                waterMl: finiteNumber(payload.waterMl),
                steps: finiteNumber(payload.steps),
                stepSource: isHealthSource(payload.stepSource) ? payload.stepSource : "manual",
                stepSyncedAt: typeof payload.stepSyncedAt === "string" ? payload.stepSyncedAt : item.updatedAt,
                manualStepOverride: Boolean(payload.manualStepOverride),
                completedHabitIds: Array.isArray(payload.completedHabitIds) ? payload.completedHabitIds.filter((value): value is string => typeof value === "string") : [],
              } };
            } else if (item.entity === "workout-session" && isWorkoutSession(payload)) {
              sessions = [payload, ...sessions.filter((entry) => entry.id !== payload.id)].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
            } else if (item.entity === "set-log" && isSetLog(payload)) {
              setLogs = [payload, ...setLogs.filter((entry) => entry.id !== payload.id)].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
            } else if (item.entity === "weight-entry" && isWeightEntry(payload)) {
              weightEntries = [payload, ...weightEntries.filter((entry) => entry.id !== payload.id)].sort((a, b) => b.date.localeCompare(a.date));
            }
          }

          return {
            profile,
            targets,
            workoutPlan,
            sessions,
            meals,
            dailyByDate,
            setLogs,
            weightEntries,
            themePreference,
            habits,
            flexDays,
            restDefaults,
            selectedLiftId,
            account: {
              ...state.account,
              profile: accountProfile,
              sharingDefaults,
              syncRecords: [...canonical.values()],
            },
          };
        }),
      resetAll: () => set({ ...initialData(), hydrated: true }),
    }),
    {
      name: "bodyfitness-store",
      version: 6,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<StoreData>;
        const newAccents = new Map(defaultWorkoutPlan.map((day) => [day.id, day.accent]));
        return {
          ...initialData(),
          ...persisted,
          workoutPlan: (persisted.workoutPlan ?? defaultWorkoutPlan).map((day) => ({
            ...day,
            accent: newAccents.get(day.id) ?? day.accent ?? "#7c5cff",
          })),
          restDefaults: persisted.restDefaults ?? { compound: 120, isolation: 90 },
          sessions: persisted.sessions ?? [],
          activeSessionId: persisted.activeSessionId ?? null,
          themePreference: persisted.themePreference ?? "system",
          account: {
            ...emptyAccount(),
            ...(persisted.account ?? {}),
            profile: { ...defaultAccountProfile, ...(persisted.account?.profile ?? {}) },
            sharingDefaults: {
              ...defaultSharing,
              ...(persisted.account?.sharingDefaults ?? {}),
            },
            circle: persisted.account?.circle ?? emptyCircle,
          },
        };
      },
      partialize: (state) => {
        const { hydrated, ...persisted } = state;
        void hydrated;
        return persisted;
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isHealthSource(value: unknown): value is HealthSource {
  return value === "manual" || value === "apple-health" || value === "health-connect" || value === "cloud";
}

function isAppProfile(value: unknown): value is AppProfile {
  return isObject(value) && typeof value.displayName === "string" && typeof value.handle === "string" && typeof value.timezone === "string";
}

function isUserProfile(value: unknown): value is UserProfile {
  return isObject(value) && typeof value.age === "number" && typeof value.heightCm === "number" && typeof value.currentWeightKg === "number";
}

function isNutritionTargets(value: unknown): value is NutritionTargets {
  return isObject(value) && typeof value.calories === "number" && typeof value.proteinG === "number" && typeof value.steps === "number";
}

function isMealEntry(value: unknown): value is MealEntry {
  return isObject(value) && typeof value.id === "string" && typeof value.name === "string" && typeof value.loggedAt === "string" && typeof value.calories === "number";
}

function isWorkoutSession(value: unknown): value is WorkoutSession {
  return isObject(value) && typeof value.id === "string" && typeof value.dayId === "string" && typeof value.startedAt === "string" && (value.endedAt === null || typeof value.endedAt === "string");
}

function isSetLog(value: unknown): value is SetLog {
  return isObject(value) && typeof value.id === "string" && typeof value.exerciseName === "string" && typeof value.completedAt === "string";
}

function isWeightEntry(value: unknown): value is WeightEntry {
  return isObject(value) && typeof value.id === "string" && typeof value.date === "string" && typeof value.weightKg === "number";
}

function isRestDefaults(value: unknown): value is { compound: number; isolation: number } {
  return isObject(value) && typeof value.compound === "number" && typeof value.isolation === "number";
}

function isSharingPolicy(value: unknown): value is SharingPolicy {
  return isObject(value) && typeof value.achievements === "boolean" && typeof value.goalProgress === "boolean" && typeof value.exactSteps === "boolean";
}
