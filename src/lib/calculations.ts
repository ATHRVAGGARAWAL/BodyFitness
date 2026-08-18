import type {
  MealEntry,
  NutritionTargets,
  SetLog,
  UserProfile,
} from "@/lib/types";
import { localDateKey, shiftDate } from "@/lib/date";
import { clamp, roundTo } from "@/lib/utils";

export function calculateBmr(profile: UserProfile) {
  if (
    profile.bodyFatPercent !== null &&
    profile.bodyFatPercent >= 5 &&
    profile.bodyFatPercent <= 60
  ) {
    const leanMass = profile.currentWeightKg * (1 - profile.bodyFatPercent / 100);
    return 370 + 21.6 * leanMass;
  }

  const base =
    10 * profile.currentWeightKg +
    6.25 * profile.heightCm -
    5 * profile.age;
  return base + (profile.sex === "male" ? 5 : -161);
}

export function recommendedActivityMultiplier(
  profile: Pick<
    UserProfile,
    "occupationActivity" | "averageSteps" | "trainingDays"
  >,
) {
  const occupationScore = {
    seated: 0,
    mixed: 1,
    active: 2,
    manual: 3,
  }[profile.occupationActivity];
  const stepScore =
    profile.averageSteps < 5_000
      ? 0
      : profile.averageSteps < 8_000
        ? 1
        : profile.averageSteps < 12_000
          ? 2
          : 3;
  const trainingScore =
    profile.trainingDays <= 1 ? 0 : profile.trainingDays <= 3 ? 1 : profile.trainingDays <= 5 ? 2 : 3;
  const average = (occupationScore + stepScore + trainingScore) / 3;

  if (average < 0.75) return 1.2;
  if (average < 1.5) return 1.375;
  if (average < 2.25) return 1.55;
  return 1.725;
}

export function calculateTargets(profile: UserProfile): NutritionTargets {
  const bmr = calculateBmr(profile);
  const tdee = bmr * profile.activityMultiplier;
  const calories = roundTo(tdee * (1 - profile.deficitPercent / 100), 25);
  const proteinG = roundTo(profile.goalWeightKg * 1.8, 5);
  const fatG = roundTo(profile.goalWeightKg * 0.8, 5);
  const carbsG = Math.max(
    0,
    roundTo((calories - proteinG * 4 - fatG * 9) / 4, 5),
  );
  const waterMl = Math.min(
    4_000,
    roundTo(profile.currentWeightKg * 35 + (profile.trainingDays > 0 ? 500 : 0), 250),
  );

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    proteinG,
    carbsG,
    fatG,
    waterMl,
    steps: 10_000,
    creatineG: 5,
  };
}

export function epley1Rm(weightKg: number, reps: number) {
  if (!weightKg || !reps) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function isProgressiveOverload(
  candidate: Pick<SetLog, "weightKg" | "reps">,
  previous?: Pick<SetLog, "weightKg" | "reps">,
) {
  if (!previous) return false;
  const current = epley1Rm(candidate.weightKg, candidate.reps);
  const prior = epley1Rm(previous.weightKg, previous.reps);
  return current >= prior * 1.01;
}

export function mealTotalsForDate(meals: MealEntry[], dateKey: string) {
  return meals
    .filter((meal) => localDateKey(meal.loggedAt) === dateKey)
    .reduce(
      (total, meal) => ({
        calories: total.calories + meal.calories,
        proteinG: total.proteinG + meal.proteinG,
        carbsG: total.carbsG + meal.carbsG,
        fatG: total.fatG + meal.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );
}

export interface RecoveryInsight {
  loggedDays: number;
  averageCalories: number;
  variance: number;
  suggestedLow: number | null;
  suggestedHigh: number | null;
}

export function calculateRecoveryInsight(
  meals: MealEntry[],
  targets: NutritionTargets,
  today = localDateKey(),
): RecoveryInsight {
  const priorDates = Array.from({ length: 6 }, (_, index) => shiftDate(today, index - 6));
  const totals = priorDates.map((date) => mealTotalsForDate(meals, date).calories);
  const logged = totals.filter((calories) => calories > 0);
  const averageCalories = logged.length
    ? Math.round(logged.reduce((sum, value) => sum + value, 0) / logged.length)
    : 0;
  const variance = averageCalories - targets.calories;

  if (logged.length < 4 || variance <= 0) {
    return {
      loggedDays: logged.length,
      averageCalories,
      variance,
      suggestedLow: null,
      suggestedHigh: null,
    };
  }

  const neededToday = targets.calories * 7 - totals.reduce((sum, value) => sum + value, 0);
  const floor = Math.max(targets.bmr, targets.tdee * 0.8);
  const center = clamp(neededToday, floor, targets.calories);

  return {
    loggedDays: logged.length,
    averageCalories,
    variance,
    suggestedLow: roundTo(Math.max(floor, center - 100), 25),
    suggestedHigh: roundTo(Math.min(targets.calories, center + 100), 25),
  };
}
