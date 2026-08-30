import type {
  Achievement,
  AppProfile,
  CircleFeed,
  Connection,
  HealthSource,
  SharingPolicy,
  SyncRecord,
} from "@bodyfitness/contracts";

export type {
  Achievement,
  AppProfile,
  CircleFeed,
  Connection,
  HealthSource,
  SharingPolicy,
  StepSnapshot,
  SyncRecord,
} from "@bodyfitness/contracts";

export type BmrSex = "male" | "female";
export type OccupationActivity = "seated" | "mixed" | "active" | "manual";
export type ExerciseType = "compound" | "isolation";
export type ThemePreference = "system" | "light" | "dark";

export interface UserProfile {
  age: number;
  sex: BmrSex;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  bodyFatPercent: number | null;
  occupationActivity: OccupationActivity;
  averageSteps: number;
  trainingDays: number;
  sessionMinutes: number;
  sleepHours: number;
  activityMultiplier: number;
  deficitPercent: number;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  steps: number;
  creatineG: number;
}

export interface FoodItem {
  id?: string;
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface FoodAnalysis {
  name: string;
  items: FoodItem[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  confidence: number;
  assumptions: string[];
}

export interface MealEntry {
  id: string;
  name: string;
  loggedAt: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items?: FoodItem[];
  source: "camera" | "manual";
}

export interface Habit {
  id: string;
  label: string;
}

export interface DailyWellness {
  creatineTaken: boolean;
  waterMl: number;
  steps: number;
  stepSource?: HealthSource;
  stepSyncedAt?: string;
  manualStepOverride?: boolean;
  completedHabitIds: string[];
}

export interface AccountState {
  profile: AppProfile;
  sharingDefaults: SharingPolicy;
  circle: CircleFeed;
  achievements: Achievement[];
  connections: Connection[];
  syncRecords: SyncRecord[];
  deviceId: string;
  syncCursor: string | null;
  lastSyncedAt: string | null;
  syncStatus: "local" | "idle" | "syncing" | "synced" | "error";
  syncError: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds?: number;
}

export interface WorkoutDay {
  id: string;
  name: string;
  accent: string;
  exercises: Exercise[];
}

export interface WorkoutSession {
  id: string;
  dayId: string;
  dayName: string;
  startedAt: string;
  /** Null while the session is still in progress. */
  endedAt: string | null;
}

export interface SetLog {
  id: string;
  dayId: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  e1rm: number;
  completedAt: string;
  isPr: boolean;
  sessionId?: string;
  /** Rest prescribed *after* this set, used to measure adherence against the next set. */
  restPrescribedSeconds?: number;
}

export interface RestTimerState {
  exerciseName: string;
  durationSeconds: number;
  endsAt: number | null;
  pausedRemaining: number | null;
}

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
}

export interface PhysiqueWeek {
  id: string;
  date: string;
  weightKg: number;
  frontPhotoId?: string;
  sidePhotoId?: string;
  backPhotoId?: string;
}

export interface VoiceSetParse {
  transcript: string;
  weightKg: number | null;
  reps: number | null;
  confidence: number;
}

export interface ProgressPoint {
  week: string;
  date: string;
  /** Null when no measurement exists for the week — the chart draws a gap rather than inventing one. */
  weight: number | null;
  e1rm: number | null;
}
