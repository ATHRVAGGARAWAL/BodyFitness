import type { FoodAnalysis, FoodItemAnalysis, MacroTotals, NutritionPlan, PlanProfile } from "@/lib/ai/schemas";

/**
 * Deterministic checks applied after the model answers. Models are good at food
 * recognition and poor at arithmetic, so the numbers are reconciled here rather than
 * trusted: item totals are re-summed and calories are reconciled against the Atwater
 * factors (4 kcal/g protein and carbohydrate, 9 kcal/g fat).
 */

export const ATWATER = { protein: 4, carbs: 4, fat: 9 } as const;

/** Calories implied by the macros alone. */
export function atwaterCalories(macros: Pick<MacroTotals, "proteinG" | "carbsG" | "fatG">) {
  return macros.proteinG * ATWATER.protein + macros.carbsG * ATWATER.carbs + macros.fatG * ATWATER.fat;
}

function round(value: number, step = 1) {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Tolerance before an item's stated calories are replaced by the macro-derived figure. */
const ITEM_TOLERANCE = 0.2;

export interface GuardResult<T> {
  value: T;
  adjustments: string[];
}

export function reconcileItem(item: FoodItemAnalysis): { item: FoodItemAnalysis; adjusted: boolean } {
  const implied = atwaterCalories(item);
  const stated = item.calories;
  // Fibre is counted inside carbohydrate by most databases, so it cannot exceed carbs.
  const fiberG = Math.min(item.fiberG, item.carbsG);
  if (implied <= 0) {
    return { item: { ...item, fiberG, calories: round(stated) }, adjusted: fiberG !== item.fiberG };
  }
  const drift = Math.abs(stated - implied) / implied;
  if (drift > ITEM_TOLERANCE) {
    return { item: { ...item, fiberG, calories: round(implied) }, adjusted: true };
  }
  return { item: { ...item, fiberG, calories: round(stated) }, adjusted: fiberG !== item.fiberG };
}

export function sumItems(items: FoodItemAnalysis[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (total, item) => ({
      calories: total.calories + item.calories,
      proteinG: total.proteinG + item.proteinG,
      carbsG: total.carbsG + item.carbsG,
      fatG: total.fatG + item.fatG,
      fiberG: total.fiberG + item.fiberG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}

/** Reconciles per-item arithmetic, recomputes totals, and rounds for display. */
export function guardFoodAnalysis(analysis: FoodAnalysis): GuardResult<FoodAnalysis> {
  const adjustments: string[] = [];
  const items = analysis.items.map((raw) => {
    const { item, adjusted } = reconcileItem(raw);
    if (adjusted) adjustments.push(`Recalculated calories for ${item.name} from its macros.`);
    return {
      ...item,
      proteinG: round(item.proteinG, 0.5),
      carbsG: round(item.carbsG, 0.5),
      fatG: round(item.fatG, 0.5),
      fiberG: round(item.fiberG, 0.5),
    };
  });

  const summed = sumItems(items);
  const totalsDiffer = Math.abs(summed.calories - analysis.totals.calories) > 5 ||
    Math.abs(summed.proteinG - analysis.totals.proteinG) > 1;
  if (totalsDiffer) adjustments.push("Totals re-summed from the itemised list.");

  const totals: MacroTotals = {
    calories: round(summed.calories),
    proteinG: round(summed.proteinG, 0.5),
    carbsG: round(summed.carbsG, 0.5),
    fatG: round(summed.fatG, 0.5),
    fiberG: round(summed.fiberG, 0.5),
  };

  // Confidence cannot exceed the weakest item by much; use a weighted blend.
  const weakest = Math.min(...items.map((item) => item.confidence));
  const confidence = clamp(Math.min(analysis.confidence, weakest * 0.4 + analysis.confidence * 0.6), 0, 1);

  return {
    value: { ...analysis, items, totals, confidence: Number(confidence.toFixed(2)) },
    adjustments,
  };
}

export interface PlanBounds {
  calorieFloor: number;
  calorieCeiling: number;
  proteinFloor: number;
  proteinCeiling: number;
  fatFloor: number;
}

/**
 * Safety envelope for an AI-configured plan, anchored on the formula baseline so the
 * model can tune within evidence-based bounds but never prescribe something extreme.
 */
export function planBounds(profile: PlanProfile, baseline: { bmr: number; tdee: number }): PlanBounds {
  const referenceKg = Math.max(profile.currentWeightKg, profile.goalWeightKg);
  const leanReference = profile.bodyFatPercent !== null
    ? profile.currentWeightKg * (1 - profile.bodyFatPercent / 100)
    : referenceKg * 0.8;
  return {
    calorieFloor: Math.ceil(Math.max(profile.sex === "female" ? 1_200 : 1_400, baseline.bmr) / 25) * 25,
    calorieCeiling: round(baseline.tdee * 1.2, 25),
    proteinFloor: round(Math.max(1.4 * referenceKg, 1.8 * leanReference), 5),
    proteinCeiling: round(2.6 * referenceKg, 5),
    fatFloor: round(0.5 * profile.currentWeightKg, 5),
  };
}

/** Clamps the plan into bounds and re-derives carbohydrate so the Atwater identity holds. */
export function guardNutritionPlan(plan: NutritionPlan, profile: PlanProfile, bounds: PlanBounds): GuardResult<NutritionPlan> {
  const adjustments: string[] = [];

  let calories = round(plan.calories, 25);
  if (calories < bounds.calorieFloor) {
    adjustments.push(`Raised calories to ${bounds.calorieFloor} so intake never drops below resting needs.`);
    calories = Math.ceil(bounds.calorieFloor / 25) * 25;
  } else if (calories > bounds.calorieCeiling) {
    adjustments.push(`Capped calories at ${bounds.calorieCeiling} to keep the surplus controlled.`);
    calories = bounds.calorieCeiling;
  }

  let proteinG = round(plan.proteinG, 5);
  if (proteinG < bounds.proteinFloor) {
    adjustments.push(`Raised protein to ${bounds.proteinFloor} g to protect lean mass.`);
    proteinG = bounds.proteinFloor;
  } else if (proteinG > bounds.proteinCeiling) {
    adjustments.push(`Lowered protein to ${bounds.proteinCeiling} g; more has no added benefit.`);
    proteinG = bounds.proteinCeiling;
  }

  let fatG = round(plan.fatG, 5);
  if (fatG < bounds.fatFloor) {
    adjustments.push(`Raised fat to ${bounds.fatFloor} g for hormonal health.`);
    fatG = bounds.fatFloor;
  }

  // Protein and fat can never leave carbs negative; scale fat down before touching protein.
  let carbsG = round((calories - proteinG * ATWATER.protein - fatG * ATWATER.fat) / ATWATER.carbs, 5);
  if (carbsG < 0) {
    fatG = Math.max(bounds.fatFloor, round((calories - proteinG * ATWATER.protein) / ATWATER.fat - 5, 5));
    carbsG = Math.max(0, round((calories - proteinG * ATWATER.protein - fatG * ATWATER.fat) / ATWATER.carbs, 5));
    adjustments.push("Rebalanced fat so carbohydrate is not negative.");
  }
  if (Math.abs(carbsG - plan.carbsG) > 10) {
    adjustments.push("Carbohydrate re-derived from calories, protein and fat.");
  }

  const fiberG = clamp(round(plan.fiberG), Math.round(calories / 1_000 * 12), 60);
  const waterMl = clamp(round(plan.waterMl, 250), 1_500, 5_000);
  const steps = clamp(round(plan.steps, 500), 4_000, 20_000);

  // Meal split must sum to the plan; rescale proportionally.
  const splitCalories = plan.mealSplit.reduce((sum, slot) => sum + slot.calories, 0) || 1;
  const splitProtein = plan.mealSplit.reduce((sum, slot) => sum + slot.proteinG, 0) || 1;
  const mealSplit = plan.mealSplit.map((slot) => ({
    ...slot,
    calories: round((slot.calories / splitCalories) * calories, 5),
    proteinG: round((slot.proteinG / splitProtein) * proteinG, 1),
  }));

  return {
    value: {
      ...plan,
      calories,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      waterMl,
      steps,
      creatineG: clamp(round(plan.creatineG, 1), 0, 5),
      mealSplit,
      expectedWeeklyChangeKg: Number(clamp(plan.expectedWeeklyChangeKg, -1.2, 0.6).toFixed(2)),
    },
    adjustments,
  };
}
