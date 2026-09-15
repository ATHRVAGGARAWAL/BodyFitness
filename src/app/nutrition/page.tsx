"use client";

import { AnimatePresence } from "framer-motion";
import { Camera, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { LargeTitle } from "@/components/large-title";
import { DescribeMealSheet } from "@/components/nutrition/describe-meal-sheet";
import { CameraView } from "@/components/snap-diet/camera-view";
import { FoodResultSheet } from "@/components/snap-diet/food-result-sheet";
import { ManualMealSheet, type ManualMealValues } from "@/components/snap-diet/manual-meal-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, SectionHeader, Stat } from "@/components/ui/section-header";
import type { FoodResult } from "@/lib/ai/client";
import type { FoodContext } from "@/lib/ai/schemas";
import { mealTotalsForDate } from "@/lib/calculations";
import { localDateKey } from "@/lib/date";
import { demoMeals } from "@/lib/seed";
import { useBodyFitnessStore } from "@/lib/store";
import type { FoodAnalysis, MealEntry } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });

export default function NutritionPage() {
  const meals = useBodyFitnessStore((state) => state.meals);
  const targets = useBodyFitnessStore((state) => state.targets);
  const profile = useBodyFitnessStore((state) => state.profile);
  const addMeal = useBodyFitnessStore((state) => state.addMeal);
  const removeMeal = useBodyFitnessStore((state) => state.removeMeal);
  const [describeOpen, setDescribeOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [analysis, setAnalysis] = useState<FoodResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [lastModel, setLastModel] = useState<string | null>(null);
  const { showToast } = useAppChrome();

  const today = localDateKey();
  const usingDemo = meals.length === 0;
  const todayMeals = useMemo(
    () => (usingDemo ? demoMeals() : meals).filter((meal) => localDateKey(meal.loggedAt) === today),
    [meals, today, usingDemo],
  );
  const shownTotals = useMemo(() => mealTotalsForDate(todayMeals, today), [todayMeals, today]);
  // Fibre is only known for meals logged with itemised AI results.
  const fibre = useMemo(() => {
    const itemised = todayMeals.flatMap((meal) => meal.items ?? []).filter((item) => typeof item.fiberG === "number");
    return itemised.length ? itemised.reduce((sum, item) => sum + (item.fiberG ?? 0), 0) : null;
  }, [todayMeals]);

  // Personalisation for the estimator is built from real data only — never the sample meals.
  const context = useMemo<FoodContext>(() => {
    const real = mealTotalsForDate(meals, today);
    return {
      region: profile.cuisine?.trim() ? profile.cuisine.trim().slice(0, 60) : null,
      dietPreference: profile.dietPreference ?? null,
      remainingProteinG: clamp(Math.max(0, targets.proteinG - real.proteinG), 0, 500),
      remainingCalories: clamp(targets.calories - real.calories, -3_000, 6_000),
    };
  }, [meals, profile.cuisine, profile.dietPreference, targets.calories, targets.proteinG, today]);

  const handleResult = (result: FoodResult) => {
    setAnalysis(result);
    setLastModel(result.meta.model);
    setResultOpen(true);
  };

  const addAnalysis = (result: FoodAnalysis) => {
    const hasImage = analysis?.meta.source === "image";
    addMeal({
      name: result.name,
      calories: result.totals.calories,
      proteinG: result.totals.proteinG,
      carbsG: result.totals.carbsG,
      fatG: result.totals.fatG,
      items: result.items,
      source: hasImage ? "camera" : "manual",
    });
    setResultOpen(false);
    setCameraOpen(false);
    showToast("Meal added to today");
  };

  const addManual = (values: ManualMealValues) => {
    addMeal({ ...values, source: "manual" });
    showToast("Meal logged");
  };

  const rail = (
    <aside className="order-first flex flex-col gap-4 md:order-none md:sticky md:top-8 md:self-start">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Log a meal</CardTitle>
            <CardDescription>Describe what you ate in plain words, attach a photo, or both. The estimator itemises portions and macros for you to check.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="brand" size="lg" block onClick={() => setDescribeOpen(true)}><Sparkles /> Describe a meal</Button>
          <Button variant="outline" block onClick={() => setCameraOpen(true)}><Camera /> Use camera</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Quick manual entry</CardTitle>
            <CardDescription>Already know the numbers? Type them in.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" block onClick={() => setManualOpen(true)}><Plus /> Enter macros</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2">
            <Badge variant="brand"><Sparkles size={11} /> AI estimator</Badge>
            {lastModel ? <span className="font-mono text-xs text-subtle-foreground">{lastModel}</span> : null}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Estimates are personalised to your cuisine, diet preference and what is left of today&apos;s targets. Photos are analysed in transit and never stored — only the macro estimate you approve is kept.
          </p>
        </CardContent>
      </Card>
    </aside>
  );

  return (
    <main className="page-shell">
      <LargeTitle
        eyebrow={dayFormat.format(new Date())}
        title="Nutrition"
        description="Log meals in words. Check the estimate. Track what is left."
        action={<Button variant="brand" className="hidden md:inline-flex" onClick={() => setDescribeOpen(true)}><Sparkles /> Log a meal</Button>}
      />

      <div className="grid gap-6 md:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <section>
            <SectionHeader index="01" title="Today" caption="Running totals against your targets." action={usingDemo ? <Badge>Sample data</Badge> : null} />
            <Card>
              <CardContent className={`grid grid-cols-2 gap-x-4 gap-y-6 pt-5 ${fibre !== null ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
                <Stat label="Calories" value={formatNumber(shownTotals.calories)} unit="kcal" hint={<Target current={shownTotals.calories} target={targets.calories} unit="kcal" />} />
                <Stat label="Protein" value={formatNumber(shownTotals.proteinG)} unit="g" hint={<Target current={shownTotals.proteinG} target={targets.proteinG} unit="g" />} />
                <Stat label="Carbs" value={formatNumber(shownTotals.carbsG)} unit="g" hint={<Target current={shownTotals.carbsG} target={targets.carbsG} unit="g" />} />
                <Stat label="Fat" value={formatNumber(shownTotals.fatG)} unit="g" hint={<Target current={shownTotals.fatG} target={targets.fatG} unit="g" />} />
                {fibre !== null ? (
                  <Stat label="Fibre" value={formatNumber(fibre)} unit="g" hint={targets.fiberG ? <Target current={fibre} target={targets.fiberG} unit="g" /> : "From itemised meals"} />
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section className="mt-10">
            <SectionHeader index="02" title="Meal log" caption={`${todayMeals.length} ${todayMeals.length === 1 ? "meal" : "meals"} today`} action={usingDemo ? <Badge>Sample data</Badge> : null} />
            {todayMeals.length ? (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {todayMeals.map((meal) => (
                    <MealRow key={meal.id} meal={meal} demo={usingDemo} onRemove={() => { removeMeal(meal.id); showToast("Meal removed"); }} />
                  ))}
                </ul>
              </Card>
            ) : (
              <EmptyState
                title="Nothing logged today"
                body="Describe your first meal and the estimator will itemise it for you."
                action={<Button variant="brand" onClick={() => setDescribeOpen(true)}><Sparkles /> Log a meal</Button>}
              />
            )}
          </section>
        </div>

        {rail}
      </div>

      <DescribeMealSheet open={describeOpen} onOpenChange={setDescribeOpen} context={context} onResult={handleResult} />
      <AnimatePresence>
        {cameraOpen && <CameraView context={context} onClose={() => setCameraOpen(false)} onResult={handleResult} />}
      </AnimatePresence>
      <FoodResultSheet
        key={analysis ? `${analysis.name}-${analysis.confidence}` : "no-analysis"}
        open={resultOpen}
        analysis={analysis}
        onOpenChange={(open) => { setResultOpen(open); if (!open && cameraOpen) setAnalysis(null); }}
        onAdd={addAnalysis}
      />
      <ManualMealSheet key={manualOpen ? "manual-open" : "manual-closed"} open={manualOpen} onOpenChange={setManualOpen} onAdd={addManual} />
    </main>
  );
}

function Target({ current, target, unit }: { current: number; target: number; unit: string }) {
  const remaining = target - current;
  if (remaining >= 0) {
    return <span><span className="number-font">{formatNumber(remaining)}</span> {unit} left of <span className="number-font">{formatNumber(target)}</span></span>;
  }
  return <span className="text-warning"><span className="number-font">{formatNumber(Math.abs(remaining))}</span> {unit} over <span className="number-font">{formatNumber(target)}</span></span>;
}

function MealRow({ meal, demo, onRemove }: { meal: MealEntry; demo: boolean; onRemove: () => void }) {
  const loggedAt = new Date(meal.loggedAt);
  const items = meal.items ?? [];
  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-base font-medium">{meal.name}</p>
            <Badge variant="outline">{meal.source === "camera" ? "Photo" : "Text"}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="number-font">{Number.isNaN(loggedAt.getTime()) ? "—" : timeFormat.format(loggedAt)}</span>
            <span className="mx-1.5 text-faint-foreground">·</span>
            <MacroLine proteinG={meal.proteinG} carbsG={meal.carbsG} fatG={meal.fatG} />
          </p>
          {items.length ? (
            <ul className="mt-3 space-y-1.5 border-l border-border pl-3">
              {items.map((item, index) => (
                <li key={item.id ?? `${meal.id}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
                  <span className="min-w-0 text-foreground">
                    {item.name}
                    {item.portion ? <span className="text-subtle-foreground"> · {item.portion}</span> : null}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="number-font text-foreground">{formatNumber(item.calories)}</span> kcal
                    <span className="mx-1.5 text-faint-foreground">·</span>
                    <MacroLine proteinG={item.proteinG} carbsG={item.carbsG} fatG={item.fatG} />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <p className="number-font text-right text-xl font-semibold leading-none">
            {formatNumber(meal.calories)}
            <span className="ml-1 text-xs font-medium text-subtle-foreground">kcal</span>
          </p>
          <Button variant="ghost" size="icon-sm" aria-label={`Remove ${meal.name}`} disabled={demo} onClick={onRemove}><Trash2 /></Button>
        </div>
      </div>
    </li>
  );
}

function MacroLine({ proteinG, carbsG, fatG }: { proteinG: number; carbsG: number; fatG: number }) {
  return (
    <span className="number-font">
      P {formatNumber(proteinG)} · C {formatNumber(carbsG)} · F {formatNumber(fatG)}
      <span className="text-subtle-foreground"> g</span>
    </span>
  );
}
