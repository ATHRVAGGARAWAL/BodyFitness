"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { calculateTargets, epley1Rm, isProgressiveOverload } from "@/lib/calculations";
import { localDateKey } from "@/lib/date";
import {
  defaultHabits,
  defaultProfile,
  defaultTargets,
  defaultWorkoutPlan,
} from "@/lib/seed";
import type {
  DailyWellness,
  Habit,
  MealEntry,
  NutritionTargets,
  PhysiqueWeek,
  RestTimerState,
  SetLog,
  ThemePreference,
  UserProfile,
  WeightEntry,
  WorkoutDay,
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
  completedHabitIds: [],
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
  setLogs: SetLog[];
  restDefaults: { compound: number; isolation: number };
  restTimer: RestTimerState;
  weightEntries: WeightEntry[];
  physiqueWeeks: PhysiqueWeek[];
  selectedLiftId: string;
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
  toggleHabit: (habitId: string, dateKey?: string) => void;
  addHabit: (label: string) => void;
  removeHabit: (id: string) => void;
  setWorkoutPlan: (plan: WorkoutDay[]) => void;
  setRestDefaults: (defaults: { compound: number; isolation: number }) => void;
  logSet: (input: {
    dayId: string;
    exerciseId: string;
    exerciseName: string;
    setNumber: number;
    weightKg: number;
    reps: number;
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
  setLogs: [],
  restDefaults: { compound: 120, isolation: 90 },
  restTimer: { ...emptyRestTimer },
  weightEntries: [],
  physiqueWeeks: [],
  selectedLiftId: "bench-press",
});

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
      logSet: (input) => {
        const state = get();
        const previous = state.setLogs.find(
          (log) =>
            log.exerciseId === input.exerciseId && log.setNumber === input.setNumber,
        );
        const log: SetLog = {
          ...input,
          id: uid("set"),
          completedAt: new Date().toISOString(),
          e1rm: Number(epley1Rm(input.weightKg, input.reps).toFixed(1)),
          isPr: isProgressiveOverload(input, previous),
        };
        set({ setLogs: [log, ...state.setLogs] });
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
      resetAll: () => set({ ...initialData(), hydrated: true }),
    }),
    {
      name: "bodyfitness-store",
      version: 4,
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
          themePreference: persisted.themePreference ?? "system",
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
