import { describe, expect, it } from "vitest";
import {
  calculateBmr,
  calculateRecoveryInsight,
  calculateTargets,
  epley1Rm,
  isProgressiveOverload,
  mealTotalsForDate,
  recommendedActivityMultiplier,
} from "@/lib/calculations";
import { defaultProfile } from "@/lib/seed";
import type { MealEntry } from "@/lib/types";

describe("target calculations", () => {
  it("uses Mifflin-St Jeor when body fat is missing", () => {
    expect(calculateBmr(defaultProfile)).toBeCloseTo(1847.5, 1);
  });

  it("uses Katch-McArdle when body fat is supplied", () => {
    expect(calculateBmr({ ...defaultProfile, bodyFatPercent: 20 })).toBeCloseTo(1838.8, 1);
  });

  it("builds the agreed recomp targets", () => {
    const targets = calculateTargets(defaultProfile);
    expect(targets.calories).toBe(2575);
    expect(targets.proteinG).toBe(140);
    expect(targets.fatG).toBe(60);
    expect(targets.waterMl).toBe(3500);
    expect(targets.steps).toBe(10_000);
  });

  it("recommends an activity band from lifestyle inputs", () => {
    expect(recommendedActivityMultiplier({ occupationActivity: "seated", averageSteps: 3_000, trainingDays: 1 })).toBe(1.2);
    expect(recommendedActivityMultiplier({ occupationActivity: "active", averageSteps: 11_000, trainingDays: 5 })).toBe(1.55);
  });
});

describe("workout calculations", () => {
  it("calculates Epley estimated one rep max", () => {
    expect(epley1Rm(60, 8)).toBe(76);
  });

  it("requires a one percent improvement for a PR", () => {
    expect(isProgressiveOverload({ weightKg: 62.5, reps: 8 }, { weightKg: 60, reps: 8 })).toBe(true);
    expect(isProgressiveOverload({ weightKg: 60, reps: 8 }, { weightKg: 60, reps: 8 })).toBe(false);
  });
});

describe("meal aggregation and recovery", () => {
  const meal = (date: string, calories: number): MealEntry => ({
    id: `${date}-${calories}`,
    name: "Meal",
    loggedAt: `${date}T12:00:00`,
    calories,
    proteinG: 30,
    carbsG: 50,
    fatG: 20,
    source: "manual",
  });

  it("totals a local calendar day", () => {
    const meals = [meal("2026-08-18", 500), meal("2026-08-18", 650), meal("2026-08-17", 900)];
    expect(mealTotalsForDate(meals, "2026-08-18")).toMatchObject({ calories: 1150, proteinG: 60 });
  });

  it("never suggests below the twenty percent TDEE guardrail", () => {
    const targets = calculateTargets(defaultProfile);
    const meals = [
      meal("2026-08-12", 3200),
      meal("2026-08-13", 3100),
      meal("2026-08-14", 3000),
      meal("2026-08-15", 3300),
      meal("2026-08-16", 3000),
      meal("2026-08-17", 3100),
    ];
    const insight = calculateRecoveryInsight(meals, targets, "2026-08-18");
    expect(insight.suggestedLow).toBeGreaterThanOrEqual(Math.max(targets.bmr, targets.tdee * 0.8));
    expect(insight.suggestedHigh).toBeLessThanOrEqual(targets.calories);
  });
});
