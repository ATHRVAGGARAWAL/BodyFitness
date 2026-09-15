import { describe, expect, it } from "vitest";
import { atwaterCalories, guardFoodAnalysis, guardNutritionPlan, planBounds } from "@/lib/ai/nutrition-guard";
import type { FoodAnalysis, NutritionPlan, PlanProfile } from "@/lib/ai/schemas";

const item = (overrides: Partial<FoodAnalysis["items"][number]> = {}): FoodAnalysis["items"][number] => ({
  name: "Dal",
  portion: "1 katori",
  portionGrams: 150,
  calories: 150,
  proteinG: 9,
  carbsG: 20,
  fatG: 4,
  fiberG: 5,
  confidence: 0.7,
  cookingNote: "",
  ...overrides,
});

const analysis = (items: FoodAnalysis["items"], totals?: FoodAnalysis["totals"]): FoodAnalysis => ({
  name: "Dal and rice",
  mealType: "lunch",
  items,
  totals: totals ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  confidence: 0.8,
  assumptions: [],
  warnings: [],
  proteinTip: "",
});

describe("guardFoodAnalysis", () => {
  it("re-sums totals from items so the header never disagrees with the list", () => {
    const result = guardFoodAnalysis(analysis([item(), item({ name: "Rice", calories: 200, proteinG: 4, carbsG: 44, fatG: 0.5, fiberG: 1 })], {
      calories: 999, proteinG: 1, carbsG: 1, fatG: 1, fiberG: 1,
    }));
    expect(result.value.totals.calories).toBe(350);
    expect(result.value.totals.proteinG).toBe(13);
    expect(result.adjustments).toContain("Totals re-summed from the itemised list.");
  });

  it("replaces item calories that contradict the macros by more than 20 percent", () => {
    // 9P + 20C + 4F = 36 + 80 + 36 = 152 kcal, but the model said 400.
    const result = guardFoodAnalysis(analysis([item({ calories: 400 })]));
    expect(result.value.items[0].calories).toBe(152);
    expect(result.adjustments[0]).toMatch(/Recalculated calories for Dal/);
  });

  it("leaves item calories alone when they are within tolerance", () => {
    const result = guardFoodAnalysis(analysis([item({ calories: 160 })]));
    expect(result.value.items[0].calories).toBe(160);
  });

  it("caps fibre at total carbohydrate", () => {
    const result = guardFoodAnalysis(analysis([item({ carbsG: 10, fiberG: 25 })]));
    expect(result.value.items[0].fiberG).toBe(10);
  });

  it("pulls overall confidence down toward the weakest item", () => {
    const result = guardFoodAnalysis(analysis([item({ confidence: 0.2 }), item({ name: "Roti", confidence: 0.9 })]));
    expect(result.value.confidence).toBeLessThan(0.8);
  });
});

const profile: PlanProfile = {
  age: 24, sex: "male", heightCm: 178, currentWeightKg: 85, goalWeightKg: 78, bodyFatPercent: null,
  occupationActivity: "mixed", averageSteps: 7_500, trainingDays: 5, sessionMinutes: 70, sleepHours: 7.5,
  activityMultiplier: 1.55, deficitPercent: 10,
};
const baseline = { bmr: 1_809, tdee: 2_804 };

const plan = (overrides: Partial<NutritionPlan> = {}): NutritionPlan => ({
  calories: 2_400, proteinG: 160, carbsG: 250, fatG: 70, fiberG: 30, waterMl: 3_250, steps: 9_000, creatineG: 5,
  expectedWeeklyChangeKg: -0.4,
  mealSplit: [
    { label: "Breakfast", calories: 600, proteinG: 40, example: "Paneer bhurji, 2 rotis" },
    { label: "Lunch", calories: 900, proteinG: 60, example: "Dal, rice, salad" },
    { label: "Dinner", calories: 900, proteinG: 60, example: "Grilled chicken, sabzi" },
  ],
  rationale: ["a", "b"], warnings: [], confidence: 0.8,
  ...overrides,
});

describe("guardNutritionPlan", () => {
  const bounds = planBounds(profile, baseline);

  it("never lets calories fall below resting needs", () => {
    const result = guardNutritionPlan(plan({ calories: 1_200 }), profile, bounds);
    expect(result.value.calories).toBeGreaterThanOrEqual(baseline.bmr);
    expect(result.adjustments.some((line) => line.startsWith("Raised calories"))).toBe(true);
  });

  it("caps surpluses at 20 percent over TDEE", () => {
    const result = guardNutritionPlan(plan({ calories: 4_500 }), profile, bounds);
    expect(result.value.calories).toBe(bounds.calorieCeiling);
  });

  it("keeps protein inside the evidence-based range", () => {
    expect(guardNutritionPlan(plan({ proteinG: 60 }), profile, bounds).value.proteinG).toBe(bounds.proteinFloor);
    expect(guardNutritionPlan(plan({ proteinG: 350 }), profile, bounds).value.proteinG).toBe(bounds.proteinCeiling);
  });

  it("re-derives carbohydrate so the Atwater identity holds", () => {
    const result = guardNutritionPlan(plan({ carbsG: 900 }), profile, bounds).value;
    const implied = atwaterCalories(result);
    expect(Math.abs(implied - result.calories)).toBeLessThanOrEqual(25);
  });

  it("rescales the meal split to the final totals", () => {
    const result = guardNutritionPlan(plan({ calories: 4_500 }), profile, bounds).value;
    const split = result.mealSplit.reduce((sum, slot) => sum + slot.calories, 0);
    expect(Math.abs(split - result.calories)).toBeLessThanOrEqual(15);
  });
});
