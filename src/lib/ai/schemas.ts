import { z } from "zod";

/**
 * Shared AI contracts. Imported by both the API routes (to constrain the model with
 * strict JSON schema) and the browser (to validate what comes back).
 *
 * Structured-output rules: every field is required and nothing is `.optional()` —
 * use `.nullable()` for absent values, otherwise strict mode rejects the schema.
 */

const macro = z.number().min(0).max(5_000);

export const MealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack", "unknown"]);
export type MealType = z.infer<typeof MealTypeSchema>;

export const FoodItemAnalysisSchema = z.object({
  name: z.string().min(1).max(80),
  portion: z.string().min(1).max(60).describe("Human-readable portion, e.g. '2 medium rotis' or '1 katori (150 g)'"),
  portionGrams: z.number().min(0).max(3_000).nullable().describe("Best estimate of edible weight in grams, null if unknowable"),
  calories: macro,
  proteinG: macro,
  carbsG: macro,
  fatG: macro,
  fiberG: macro,
  confidence: z.number().min(0).max(1),
  cookingNote: z.string().max(120).describe("Cooking method or hidden-ingredient note, empty string if none"),
});
export type FoodItemAnalysis = z.infer<typeof FoodItemAnalysisSchema>;

export const MacroTotalsSchema = z.object({
  calories: macro,
  proteinG: macro,
  carbsG: macro,
  fatG: macro,
  fiberG: macro,
});
export type MacroTotals = z.infer<typeof MacroTotalsSchema>;

export const FoodAnalysisSchema = z.object({
  name: z.string().min(1).max(80).describe("Short meal title"),
  mealType: MealTypeSchema,
  items: z.array(FoodItemAnalysisSchema).min(1).max(20),
  totals: MacroTotalsSchema,
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string().max(160)).max(8),
  warnings: z.array(z.string().max(160)).max(5).describe("Things the user should double-check"),
  proteinTip: z.string().max(200).describe("One concrete way to make this meal more protein-forward, or empty string"),
});
export type FoodAnalysis = z.infer<typeof FoodAnalysisSchema>;

export const FoodContextSchema = z.object({
  region: z.string().max(60).nullable(),
  dietPreference: z.enum(["vegetarian", "eggetarian", "non-vegetarian", "vegan"]).nullable(),
  remainingProteinG: z.number().min(0).max(500).nullable(),
  remainingCalories: z.number().min(-3_000).max(6_000).nullable(),
});
export type FoodContext = z.infer<typeof FoodContextSchema>;

export const GoalSchema = z.enum(["fat-loss", "recomp", "muscle-gain", "maintain"]);
export type Goal = z.infer<typeof GoalSchema>;

export const DietPreferenceSchema = z.enum(["vegetarian", "eggetarian", "non-vegetarian", "vegan"]);
export type DietPreference = z.infer<typeof DietPreferenceSchema>;

export const PlanProfileSchema = z.object({
  age: z.number().int().min(13).max(100),
  sex: z.enum(["male", "female"]),
  heightCm: z.number().min(120).max(230),
  currentWeightKg: z.number().min(30).max(300),
  goalWeightKg: z.number().min(30).max(300),
  bodyFatPercent: z.number().min(3).max(70).nullable(),
  occupationActivity: z.enum(["seated", "mixed", "active", "manual"]),
  averageSteps: z.number().int().min(0).max(50_000),
  trainingDays: z.number().int().min(0).max(7),
  sessionMinutes: z.number().int().min(0).max(240),
  sleepHours: z.number().min(3).max(14),
  activityMultiplier: z.number().min(1).max(2.5),
  deficitPercent: z.number().min(-30).max(40),
});
export type PlanProfile = z.infer<typeof PlanProfileSchema>;

export const PlanRequestSchema = z.object({
  profile: PlanProfileSchema,
  goal: GoalSchema,
  dietPreference: DietPreferenceSchema,
  cuisine: z.string().max(80).default(""),
  notes: z.string().max(600).default(""),
});
export type PlanRequest = z.infer<typeof PlanRequestSchema>;

export const MealSlotSchema = z.object({
  label: z.string().min(1).max(40),
  calories: macro,
  proteinG: macro,
  example: z.string().max(160).describe("A concrete example meal matching the cuisine and diet preference"),
});

export const NutritionPlanSchema = z.object({
  calories: z.number().min(800).max(6_000),
  proteinG: z.number().min(40).max(400),
  carbsG: z.number().min(0).max(900),
  fatG: z.number().min(20).max(300),
  fiberG: z.number().min(10).max(80),
  waterMl: z.number().min(1_000).max(6_000),
  steps: z.number().int().min(2_000).max(25_000),
  creatineG: z.number().min(0).max(10),
  expectedWeeklyChangeKg: z.number().min(-1.5).max(1).describe("Negative for loss"),
  mealSplit: z.array(MealSlotSchema).min(2).max(6),
  rationale: z.array(z.string().max(220)).min(2).max(6).describe("Plain-language reasons, each one sentence"),
  warnings: z.array(z.string().max(200)).max(4),
  confidence: z.number().min(0).max(1),
});
export type NutritionPlan = z.infer<typeof NutritionPlanSchema>;

export const PlanResponseSchema = z.object({
  plan: NutritionPlanSchema,
  baseline: z.object({
    bmr: z.number(),
    tdee: z.number(),
    calories: z.number(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
    waterMl: z.number(),
    steps: z.number(),
    creatineG: z.number(),
  }),
  adjustments: z.array(z.string()).describe("What the guard changed after the model answered"),
  model: z.string(),
});
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

export const CoachDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  calories: z.number().min(0).max(10_000),
  proteinG: z.number().min(0).max(600),
  carbsG: z.number().min(0).max(1_500),
  fatG: z.number().min(0).max(500),
  waterMl: z.number().min(0).max(10_000),
  steps: z.number().int().min(0).max(80_000),
  trained: z.boolean(),
  logged: z.boolean().describe("False when nothing was logged that day"),
});

export const CoachRequestSchema = z.object({
  goal: GoalSchema,
  targets: z.object({
    calories: z.number(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
    waterMl: z.number(),
    steps: z.number(),
  }),
  profile: z.object({
    age: z.number(),
    sex: z.enum(["male", "female"]),
    currentWeightKg: z.number(),
    goalWeightKg: z.number(),
  }),
  days: z.array(CoachDaySchema).min(1).max(14),
  weights: z.array(z.object({ date: z.string(), weightKg: z.number() })).max(30),
  personalRecords: z.number().int().min(0).max(500),
});
export type CoachRequest = z.infer<typeof CoachRequestSchema>;

export const CoachInsightSchema = z.object({
  headline: z.string().min(1).max(140).describe("One short sentence, ideally under 70 characters"),
  adherenceScore: z.number().int().min(0).max(100),
  assessment: z.string().min(1).max(1_200).describe("Three to five sentences"),
  wins: z.array(z.string().max(160)).max(4),
  risks: z.array(z.string().max(160)).max(4),
  adjustments: z.array(z.object({
    area: z.enum(["calories", "protein", "carbs", "fat", "water", "steps", "training", "sleep", "consistency"]),
    change: z.string().min(1).max(120),
    why: z.string().min(1).max(200),
  })).max(4),
  nextActions: z.array(z.string().max(140)).min(1).max(3),
  suggestedTargets: z.object({
    calories: z.number().min(800).max(6_000),
    proteinG: z.number().min(40).max(400),
  }).nullable().describe("Only when a target change is clearly warranted"),
  confidence: z.number().min(0).max(1),
});
export type CoachInsight = z.infer<typeof CoachInsightSchema>;

export const VoiceSetSchema = z.object({
  weightKg: z.number().nonnegative().nullable(),
  reps: z.number().int().nonnegative().nullable(),
  confidence: z.number().min(0).max(1),
});

export const AiErrorSchema = z.object({ error: z.string(), code: z.string().optional() });
