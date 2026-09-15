"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { AiClientError, configurePlan } from "@/lib/ai/client";
import type { DietPreference, Goal, PlanResponse } from "@/lib/ai/schemas";
import { calculateTargets } from "@/lib/calculations";
import { fadeRise, T } from "@/lib/motion";
import { useBodyFitnessStore } from "@/lib/store";
import type { UserProfile } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const goals: Array<{ id: Goal; label: string; hint: string }> = [
  { id: "fat-loss", label: "Fat loss", hint: "Lose fat, keep strength" },
  { id: "recomp", label: "Recomp", hint: "Slow loss, build muscle" },
  { id: "muscle-gain", label: "Muscle gain", hint: "Controlled surplus" },
  { id: "maintain", label: "Maintain", hint: "Hold weight, improve" },
];

const diets: Array<{ id: DietPreference; label: string }> = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "eggetarian", label: "Eggetarian" },
  { id: "non-vegetarian", label: "Non-vegetarian" },
  { id: "vegan", label: "Vegan" },
];

/**
 * AI target configuration. Sends the profile + goal to `/api/ai/plan`, shows the
 * model's plan side by side with the formula baseline, and lets the user accept it.
 * Works during onboarding (pass the draft profile) and from the profile page.
 */
export function PlanConfigurator({
  profile,
  onProfileChange,
  onApplied,
  className,
}: {
  profile: UserProfile;
  onProfileChange?: (patch: Partial<UserProfile>) => void;
  onApplied?: () => void;
  className?: string;
}) {
  const applyAiPlan = useBodyFitnessStore((state) => state.applyAiPlan);
  const updateProfile = useBodyFitnessStore((state) => state.updateProfile);
  const targetsSource = useBodyFitnessStore((state) => state.targetsSource);
  const aiPlan = useBodyFitnessStore((state) => state.aiPlan);
  const { showToast } = useAppChrome();

  const [goal, setGoal] = useState<Goal>(profile.goal ?? "recomp");
  const [diet, setDiet] = useState<DietPreference>(profile.dietPreference ?? "vegetarian");
  const [cuisine, setCuisine] = useState(profile.cuisine ?? "");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [result, setResult] = useState<PlanResponse | null>(null);

  const baseline = useMemo(() => calculateTargets(profile), [profile]);

  const patchProfile = (patch: Partial<UserProfile>) => {
    onProfileChange?.(patch);
  };

  async function run() {
    setStatus("loading");
    setError(null);
    try {
      const response = await configurePlan({
        profile: {
          age: profile.age,
          sex: profile.sex,
          heightCm: profile.heightCm,
          currentWeightKg: profile.currentWeightKg,
          goalWeightKg: profile.goalWeightKg,
          bodyFatPercent: profile.bodyFatPercent,
          occupationActivity: profile.occupationActivity,
          averageSteps: profile.averageSteps,
          trainingDays: profile.trainingDays,
          sessionMinutes: profile.sessionMinutes,
          sleepHours: profile.sleepHours,
          activityMultiplier: profile.activityMultiplier,
          deficitPercent: profile.deficitPercent,
        },
        goal,
        dietPreference: diet,
        cuisine,
        notes,
      });
      setResult(response);
      setStatus("ready");
    } catch (caught) {
      const message = caught instanceof AiClientError ? caught.message : "The plan could not be generated.";
      const code = caught instanceof AiClientError ? caught.code : "unknown";
      setError({ message, code });
      setStatus("error");
    }
  }

  function accept() {
    if (!result) return;
    applyAiPlan(result.plan, { model: result.model, adjustments: result.adjustments });
    const nextProfile = { ...profile, goal, dietPreference: diet, cuisine };
    if (onProfileChange) patchProfile({ goal, dietPreference: diet, cuisine });
    else updateProfile(nextProfile);
    showToast("AI plan applied");
    onApplied?.();
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Goal</p>
          <div className="grid grid-cols-2 gap-2">
            {goals.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => { setGoal(option.id); patchProfile({ goal: option.id }); }}
                aria-pressed={goal === option.id}
                className={cn(
                  "pressable rounded-lg border px-3 py-2.5 text-left transition-colors",
                  goal === option.id ? "border-foreground bg-card" : "border-border bg-card hover:bg-accent",
                )}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Field label="Diet">
            <Select value={diet} onChange={(event) => { const value = event.target.value as DietPreference; setDiet(value); patchProfile({ dietPreference: value }); }}>
              {diets.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="Cuisine" hint="Shapes the example meals">
            <Input value={cuisine} maxLength={80} placeholder="e.g. North Indian, hostel mess" onChange={(event) => { setCuisine(event.target.value); patchProfile({ cuisine: event.target.value }); }} />
          </Field>
        </div>
      </div>

      <Field label="Anything the coach should know" hint="Optional: allergies, schedule, foods you dislike">
        <Textarea value={notes} maxLength={600} rows={2} className="min-h-16" placeholder="Lactose intolerant, train at 6am, hate oats…" onChange={(event) => setNotes(event.target.value)} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="brand" size="lg" onClick={run} disabled={status === "loading"}>
          <Sparkles /> {status === "loading" ? "Configuring…" : result ? "Regenerate plan" : "Configure with AI"}
        </Button>
        {targetsSource === "ai" && aiPlan ? <Badge variant="brand"><Check size={12} /> AI plan active</Badge> : <Badge>Formula baseline</Badge>}
        <span className="text-xs text-muted-foreground">Baseline: {formatNumber(baseline.calories)} kcal · {baseline.proteinG} g protein</span>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {status === "loading" && (
          <motion.div key="loading" variants={fadeRise} initial="hidden" animate="visible" exit="exit" transition={T.base} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="relative block h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.span className="absolute inset-y-0 w-1/3 rounded-full bg-brand" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
              </span>
              Reasoning over your profile, baseline and goal
            </div>
          </motion.div>
        )}

        {status === "error" && error && (
          <motion.div key="error" variants={fadeRise} initial="hidden" animate="visible" exit="exit" transition={T.base} role="alert" className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning" />
            <div className="text-sm">
              <p className="font-medium">{error.message}</p>
              {error.code === "ai_not_configured" && <p className="mt-1 text-muted-foreground">The formula targets still work. Add an AI key on the server to enable configuration.</p>}
            </div>
          </motion.div>
        )}

        {status === "ready" && result && (
          <motion.div key="ready" variants={fadeRise} initial="hidden" animate="visible" exit="exit" transition={T.base} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid grid-cols-3 border-b border-border text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">
              <span className="px-5 py-3">Target</span>
              <span className="px-3 py-3 text-right">Formula</span>
              <span className="px-5 py-3 text-right text-brand">AI plan</span>
            </div>
            {([
              ["Calories", result.baseline.calories, result.plan.calories, "kcal"],
              ["Protein", result.baseline.proteinG, result.plan.proteinG, "g"],
              ["Carbs", result.baseline.carbsG, result.plan.carbsG, "g"],
              ["Fat", result.baseline.fatG, result.plan.fatG, "g"],
              ["Fibre", null, result.plan.fiberG, "g"],
              ["Water", result.baseline.waterMl, result.plan.waterMl, "ml"],
              ["Steps", result.baseline.steps, result.plan.steps, ""],
            ] as Array<[string, number | null, number, string]>).map(([label, before, after, unit]) => (
              <div key={label} className="grid grid-cols-3 items-center border-b border-border last:border-b-0">
                <span className="px-5 py-2.5 text-sm">{label}</span>
                <span className="number-font px-3 py-2.5 text-right text-sm text-muted-foreground">{before === null ? "—" : formatNumber(before)}{before !== null && unit ? ` ${unit}` : ""}</span>
                <span className={cn("number-font px-5 py-2.5 text-right text-sm font-semibold", before !== null && before !== after && "text-brand")}>{formatNumber(after)}{unit ? ` ${unit}` : ""}</span>
              </div>
            ))}

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">Expected {result.plan.expectedWeeklyChangeKg > 0 ? "+" : ""}{result.plan.expectedWeeklyChangeKg.toFixed(2)} kg / week</Badge>
                <Badge variant="neutral">Confidence {Math.round(result.plan.confidence * 100)}%</Badge>
                <Badge variant="outline">{result.model}</Badge>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Why these numbers</p>
                <ul className="space-y-1.5 text-sm leading-relaxed">
                  {result.plan.rationale.map((line, index) => <li key={index} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-foreground" />{line}</li>)}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Suggested day</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.plan.mealSplit.map((slot) => (
                    <div key={slot.label} className="rounded-lg border border-border bg-muted px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2"><span className="text-sm font-medium">{slot.label}</span><span className="number-font text-xs text-muted-foreground">{formatNumber(slot.calories)} kcal · {slot.proteinG} g P</span></div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{slot.example}</p>
                    </div>
                  ))}
                </div>
              </div>

              {result.plan.warnings.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] text-warning"><TriangleAlert size={12} /> Worth knowing</p>
                  <ul className="space-y-1 text-sm">{result.plan.warnings.map((line, index) => <li key={index}>{line}</li>)}</ul>
                </div>
              )}

              {result.adjustments.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none font-medium">Safety checks applied ({result.adjustments.length})</summary>
                  <ul className="mt-2 space-y-1">{result.adjustments.map((line, index) => <li key={index}>{line}</li>)}</ul>
                </details>
              )}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => { setResult(null); setStatus("idle"); }}><RotateCcw /> Keep formula</Button>
                <Button variant="primary" size="lg" onClick={accept}><Check /> Use this plan <ArrowRight /></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
