import AsyncStorage from "@react-native-async-storage/async-storage";
import { effectiveStepSnapshot } from "@bodyfitness/core";
import type { AppProfile, CircleFeed, StepSnapshot, SyncEntity, SyncRecord } from "@bodyfitness/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { localDateKey } from "../lib/date";

export type ThemePreference = "system" | "light" | "dark";
export type HealthPermissionState = "unknown" | "unavailable" | "needs-permission" | "connected" | "denied" | "error";

export interface MobileMeal {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedAt: string;
}

export interface MobileWorkout {
  id: string;
  name: string;
  completedAt: string;
  durationMinutes: number;
}

interface MobileState {
  hydrated: boolean;
  deviceId: string;
  themePreference: ThemePreference;
  profile: AppProfile;
  stepTarget: number;
  providerSteps: Record<string, StepSnapshot>;
  manualSteps: Record<string, StepSnapshot>;
  healthPermission: HealthPermissionState;
  healthMessage: string | null;
  circle: CircleFeed;
  meals: MobileMeal[];
  workouts: MobileWorkout[];
  weights: Array<{ id: string; date: string; weightKg: number }>;
  records: Record<string, SyncRecord>;
  pendingRecordKeys: string[];
  syncCursor: string | null;
  syncStatus: "local" | "idle" | "syncing" | "synced" | "error";
  syncError: string | null;
  lastSyncedAt: string | null;
  pushToken: string | null;
  setThemePreference: (value: ThemePreference) => void;
  updateProfile: (profile: AppProfile) => void;
  setProviderSteps: (snapshot: StepSnapshot) => void;
  setManualSteps: (steps: number, date?: string) => void;
  clearManualOverride: (date?: string) => void;
  setHealthPermission: (status: HealthPermissionState, message?: string | null) => void;
  setCircle: (circle: CircleFeed) => void;
  addMeal: (meal: Omit<MobileMeal, "id" | "loggedAt">) => void;
  completeWorkout: (name: string, durationMinutes: number) => void;
  addWeight: (weightKg: number, date?: string) => void;
  setPushToken: (token: string | null) => void;
  beginSync: () => void;
  finishSync: (input: { accepted: string[]; sent: SyncRecord[]; remote: SyncRecord[]; conflicts: SyncRecord[]; cursor: string; syncedAt: string }) => void;
  failSync: (message: string) => void;
  resetCloudState: () => void;
}

const emptyProfile: AppProfile = {
  displayName: "Athlete",
  handle: "athlete_mobile",
  birthDate: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  primaryStepSource: null,
};

const emptyCircle: CircleFeed = { members: [], pendingInvites: 0, generatedAt: "1970-01-01T00:00:00.000Z" };

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function recordKey(record: Pick<SyncRecord, "entity" | "entityId">) {
  return `${record.entity}:${record.entityId}`;
}

function makeRecord(records: Record<string, SyncRecord>, entity: SyncEntity, entityId: string, payload: Record<string, unknown>): SyncRecord {
  const key = `${entity}:${entityId}`;
  return { entity, entityId, revision: (records[key]?.revision ?? 0) + 1, updatedAt: new Date().toISOString(), deletedAt: null, payload };
}

function queueRecord(state: MobileState, record: SyncRecord) {
  const key = recordKey(record);
  return {
    records: { ...state.records, [key]: record },
    pendingRecordKeys: state.pendingRecordKeys.includes(key) ? state.pendingRecordKeys : [...state.pendingRecordKeys, key],
  };
}

function dailyPayload(snapshot: StepSnapshot | null) {
  return {
    steps: snapshot?.steps ?? 0,
    stepSource: snapshot?.source ?? "manual",
    stepSyncedAt: snapshot?.syncedAt ?? new Date().toISOString(),
    manualStepOverride: snapshot?.isManualOverride ?? false,
    completedHabitIds: [],
    waterMl: 0,
    creatineTaken: false,
  };
}

export const useMobileStore = create<MobileState>()(persist((set) => ({
  hydrated: false,
  deviceId: uid("mobile"),
  themePreference: "system",
  profile: emptyProfile,
  stepTarget: 10_000,
  providerSteps: {},
  manualSteps: {},
  healthPermission: "unknown",
  healthMessage: null,
  circle: emptyCircle,
  meals: [],
  workouts: [],
  weights: [],
  records: {},
  pendingRecordKeys: [],
  syncCursor: null,
  syncStatus: "local",
  syncError: null,
  lastSyncedAt: null,
  pushToken: null,
  setThemePreference: (themePreference) => set({ themePreference }),
  updateProfile: (profile) => set((state) => ({ profile, ...queueRecord(state, makeRecord(state.records, "profile", "account", profile)) })),
  setProviderSteps: (snapshot) => set((state) => {
    const providerSteps = { ...state.providerSteps, [snapshot.date]: snapshot };
    const effective = effectiveStepSnapshot(snapshot, state.manualSteps[snapshot.date] ?? null);
    const record = makeRecord(state.records, "daily-wellness", snapshot.date, dailyPayload(effective));
    return { providerSteps, profile: { ...state.profile, primaryStepSource: snapshot.source }, ...queueRecord(state, record) };
  }),
  setManualSteps: (steps, date = localDateKey()) => set((state) => {
    const snapshot: StepSnapshot = { date, steps: Math.max(0, Math.round(steps)), source: "manual", deviceId: null, syncedAt: new Date().toISOString(), isManualOverride: true };
    const record = makeRecord(state.records, "daily-wellness", date, dailyPayload(snapshot));
    return { manualSteps: { ...state.manualSteps, [date]: snapshot }, ...queueRecord(state, record) };
  }),
  clearManualOverride: (date = localDateKey()) => set((state) => {
    const manualSteps = { ...state.manualSteps };
    delete manualSteps[date];
    const record = makeRecord(state.records, "daily-wellness", date, dailyPayload(state.providerSteps[date] ?? null));
    return { manualSteps, ...queueRecord(state, record) };
  }),
  setHealthPermission: (healthPermission, healthMessage = null) => set({ healthPermission, healthMessage }),
  setCircle: (circle) => set({ circle }),
  addMeal: (input) => set((state) => {
    const meal: MobileMeal = { ...input, id: uid("meal"), loggedAt: new Date().toISOString() };
    return { meals: [meal, ...state.meals], ...queueRecord(state, makeRecord(state.records, "meal", meal.id, meal as unknown as Record<string, unknown>)) };
  }),
  completeWorkout: (name, durationMinutes) => set((state) => {
    const workout: MobileWorkout = { id: uid("workout"), name, durationMinutes, completedAt: new Date().toISOString() };
    const payload = { exerciseName: name, completedAt: workout.completedAt, durationMinutes, isPr: false };
    return { workouts: [workout, ...state.workouts], ...queueRecord(state, makeRecord(state.records, "set-log", workout.id, payload)) };
  }),
  addWeight: (weightKg, date = localDateKey()) => set((state) => {
    const entry = { id: uid("weight"), date, weightKg };
    return { weights: [entry, ...state.weights.filter((item) => item.date !== date)], ...queueRecord(state, makeRecord(state.records, "weight-entry", entry.id, entry)) };
  }),
  setPushToken: (pushToken) => set({ pushToken }),
  beginSync: () => set({ syncStatus: "syncing", syncError: null }),
  finishSync: ({ accepted, sent, remote, conflicts, cursor, syncedAt }) => set((state) => {
    const sentByKey = new Map(sent.map((record) => [recordKey(record), record]));
    const acceptedSet = new Set(accepted);
    const conflictSet = new Set(conflicts.map(recordKey));
    const pendingRecordKeys = state.pendingRecordKeys.filter((key) => {
      const sentRecord = sentByKey.get(key);
      const current = state.records[key];
      if (!sentRecord || !current || current.revision > sentRecord.revision) return true;
      return !acceptedSet.has(key) && !conflictSet.has(key);
    });
    const records = { ...state.records };
    let profile = state.profile;
    let stepTarget = state.stepTarget;
    let providerSteps = state.providerSteps;
    let manualSteps = state.manualSteps;
    let meals = state.meals;
    let workouts = state.workouts;
    let weights = state.weights;
    let themePreference = state.themePreference;
    for (const record of [...remote, ...conflicts]) {
      const key = recordKey(record);
      if (records[key] && records[key].revision > record.revision) continue;
      records[key] = record;
      if (record.deletedAt) continue;
      const payload = record.payload;
      if (record.entity === "profile") {
        const candidate = isRecord(payload.account) ? payload.account : payload;
        if (isMobileProfile(candidate)) profile = candidate;
      } else if (record.entity === "targets" && typeof payload.steps === "number") {
        stepTarget = Math.max(1, Math.round(payload.steps));
      } else if (record.entity === "daily-wellness") {
        const source = isStepSource(payload.stepSource) ? payload.stepSource : "manual";
        const snapshot: StepSnapshot = { date: record.entityId, steps: Math.max(0, Math.round(Number(payload.steps ?? 0))), source, deviceId: null, syncedAt: typeof payload.stepSyncedAt === "string" ? payload.stepSyncedAt : record.updatedAt, isManualOverride: Boolean(payload.manualStepOverride) };
        if (snapshot.isManualOverride || source === "manual") manualSteps = { ...manualSteps, [record.entityId]: snapshot };
        else providerSteps = { ...providerSteps, [record.entityId]: snapshot };
      } else if (record.entity === "meal" && isRecord(payload) && typeof payload.name === "string") {
        const meal: MobileMeal = { id: record.entityId, name: payload.name, calories: Number(payload.calories ?? 0), proteinG: Number(payload.proteinG ?? 0), carbsG: Number(payload.carbsG ?? 0), fatG: Number(payload.fatG ?? 0), loggedAt: typeof payload.loggedAt === "string" ? payload.loggedAt : record.updatedAt };
        meals = [meal, ...meals.filter((item) => item.id !== meal.id)].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
      } else if (record.entity === "set-log" && typeof payload.exerciseName === "string") {
        const workout: MobileWorkout = { id: record.entityId, name: payload.exerciseName, completedAt: typeof payload.completedAt === "string" ? payload.completedAt : record.updatedAt, durationMinutes: Math.max(1, Math.round(Number(payload.durationMinutes ?? 1))) };
        workouts = [workout, ...workouts.filter((item) => item.id !== workout.id)].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
      } else if (record.entity === "weight-entry" && typeof payload.weightKg === "number") {
        const entry = { id: record.entityId, date: typeof payload.date === "string" ? payload.date : record.updatedAt.slice(0, 10), weightKg: payload.weightKg };
        weights = [entry, ...weights.filter((item) => item.id !== entry.id)].sort((a, b) => b.date.localeCompare(a.date));
      } else if (record.entity === "settings" && (payload.themePreference === "system" || payload.themePreference === "light" || payload.themePreference === "dark")) {
        themePreference = payload.themePreference;
      }
    }
    return { records, pendingRecordKeys, profile, stepTarget, providerSteps, manualSteps, meals, workouts, weights, themePreference, syncCursor: cursor, lastSyncedAt: syncedAt, syncStatus: "synced", syncError: null };
  }),
  failSync: (syncError) => set({ syncStatus: "error", syncError }),
  resetCloudState: () => set({ circle: emptyCircle, syncCursor: null, syncStatus: "local", syncError: null, lastSyncedAt: null, pushToken: null }),
}), {
  name: "bodyfitness-mobile-v1",
  version: 1,
  storage: createJSONStorage(() => AsyncStorage),
  onRehydrateStorage: () => () => useMobileStore.setState({ hydrated: true }),
  partialize: (state) => {
    const { hydrated, ...persistedState } = state;
    void hydrated;
    return persistedState;
  },
}));

export function effectiveStepsForDate(date = localDateKey()) {
  const state = useMobileStore.getState();
  return effectiveStepSnapshot(state.providerSteps[date] ?? null, state.manualSteps[date] ?? null);
}

export function pendingSyncRecords() {
  const state = useMobileStore.getState();
  return state.pendingRecordKeys.map((key) => state.records[key]).filter((record): record is SyncRecord => Boolean(record));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isMobileProfile(value: unknown): value is AppProfile {
  return isRecord(value) && typeof value.displayName === "string" && typeof value.handle === "string" && typeof value.timezone === "string";
}

function isStepSource(value: unknown): value is StepSnapshot["source"] {
  return value === "manual" || value === "apple-health" || value === "health-connect" || value === "cloud";
}
