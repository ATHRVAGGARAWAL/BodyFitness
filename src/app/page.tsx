"use client";

import { motion } from "framer-motion";
import { Check, ChevronRight, Flame, Settings2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { ActivityRings } from "@/components/dashboard/activity-rings";
import { AdaptiveCard } from "@/components/dashboard/adaptive-card";
import { HabitList } from "@/components/dashboard/habit-list";
import { WaterGauge } from "@/components/dashboard/water-gauge";
import { LargeTitle } from "@/components/large-title";
import { MetricEntrySheet } from "@/components/metric-entry-sheet";
import { SettingsSheet } from "@/components/settings-sheet";
import { calculateRecoveryInsight, mealTotalsForDate } from "@/lib/calculations";
import { localDateKey } from "@/lib/date";
import { demoMeals } from "@/lib/seed";
import { useBodyFitnessStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const targets = useBodyFitnessStore((state) => state.targets);
  const meals = useBodyFitnessStore((state) => state.meals);
  const dailyByDate = useBodyFitnessStore((state) => state.dailyByDate);
  const habits = useBodyFitnessStore((state) => state.habits);
  const flexDays = useBodyFitnessStore((state) => state.flexDays);
  const setCreatine = useBodyFitnessStore((state) => state.setCreatine);
  const addWater = useBodyFitnessStore((state) => state.addWater);
  const setSteps = useBodyFitnessStore((state) => state.setSteps);
  const toggleHabit = useBodyFitnessStore((state) => state.toggleHabit);
  const toggleFlexDay = useBodyFitnessStore((state) => state.toggleFlexDay);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);

  const today = localDateKey();
  const daily = dailyByDate[today];
  const usingDemo = meals.length === 0;
  const visibleMeals = usingDemo ? demoMeals() : meals;
  const totals = mealTotalsForDate(visibleMeals, today);
  const steps = daily?.steps || (usingDemo ? 6_840 : 0);
  const water = daily?.waterMl ?? 0;
  const completedHabitIds = daily?.completedHabitIds ?? [];
  const insight = useMemo(
    () =>
      usingDemo
        ? { loggedDays: 5, averageCalories: targets.calories - 74, variance: -74, suggestedLow: null, suggestedHigh: null }
        : calculateRecoveryInsight(meals, targets),
    [meals, targets, usingDemo],
  );

  return (
    <main className="page-shell">
      <LargeTitle
        eyebrow={new Intl.DateTimeFormat("en-IN", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
        title="Summary"
        action={
          <button aria-label="Open settings" onClick={() => setSettingsOpen(true)} className="icon-button pressable">
            <Settings2 size={19} />
          </button>
        }
      />

      <div className="mb-2 flex items-center justify-end px-1">
        {usingDemo && <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white/35">Sample data</span>}
      </div>
      <button className="w-full text-left" onClick={() => setStepsOpen(true)} aria-label="Open rings and edit steps">
        <ActivityRings
          calories={totals.calories}
          calorieTarget={targets.calories}
          protein={totals.proteinG}
          proteinTarget={targets.proteinG}
          steps={steps}
          stepTarget={targets.steps}
        />
      </button>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between px-1">
          <div>
            <p className="section-kicker m-0">Foundation</p>
            <p className="mb-0 mt-1 text-[21px] font-bold tracking-[-0.035em]">Daily non-negotiables</p>
          </div>
          <Sparkles size={18} className="mb-1 text-[#bf5af2] drop-shadow-[0_0_12px_#bf5af2]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="ios-card flex min-h-[184px] flex-col justify-between overflow-hidden p-4">
            <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#bf5af2]/15 blur-[38px]" />
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#bf5af2]/15 text-[#d28cff] ring-1 ring-[#bf5af2]/15">
                <span className="number-font text-[13px] font-black">5g</span>
              </div>
              <IosToggle checked={daily?.creatineTaken ?? false} onChange={setCreatine} />
            </div>
            <div className="relative">
              <p className="section-kicker m-0">Supplement</p>
              <p className="mb-0 mt-1 text-[18px] font-bold">Creatine</p>
              <p className="mt-1 text-[10px] text-white/32">{daily?.creatineTaken ? "Done for today" : "Keep saturation steady"}</p>
            </div>
          </div>
          <WaterGauge valueMl={water} targetMl={targets.waterMl} onChange={addWater} />
        </div>

        <div className="mt-3">
          <HabitList habits={habits} completedIds={completedHabitIds} onToggle={toggleHabit} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 px-1">
          <p className="section-kicker m-0">Intelligence</p>
          <p className="mb-0 mt-1 text-[21px] font-bold tracking-[-0.035em]">Adaptive nutrition</p>
        </div>
        <AdaptiveCard insight={insight} target={targets.calories} demo={usingDemo} isFlexDay={flexDays.includes(today)} onToggleFlexDay={() => toggleFlexDay(today)} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="section-kicker m-0">Nutrition log</p>
            <p className="mb-0 mt-1 text-[21px] font-bold tracking-[-0.035em]">Today’s food</p>
          </div>
          <span className="capsule-control number-font flex h-8 items-center px-3 text-[10px] font-semibold text-white/38">{formatNumber(totals.proteinG)}g protein</span>
        </div>
        <div className="ios-card overflow-hidden">
          {visibleMeals.filter((meal) => localDateKey(meal.loggedAt) === today).slice(0, 3).map((meal, index, array) => (
            <motion.div key={meal.id} className={cn("flex min-h-[64px] items-center gap-3 px-4", index < array.length - 1 && "hairline")}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff375f]/12 text-[#ff375f]">
                <Flame size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[13px] font-semibold">{meal.name}</p>
                <p className="mt-1 text-[10px] text-white/30">{meal.proteinG}g protein · {meal.carbsG}g carbs</p>
              </div>
              <div className="text-right">
                <p className="number-font m-0 text-sm font-bold">{formatNumber(meal.calories)}</p>
                <p className="m-0 text-[9px] text-white/25">kcal</p>
              </div>
              <ChevronRight size={14} className="text-white/18" />
            </motion.div>
          ))}
        </div>
      </section>

      <SettingsSheet key={settingsOpen ? "settings-open" : "settings-closed"} open={settingsOpen} onOpenChange={setSettingsOpen} />
      <MetricEntrySheet key={stepsOpen ? "steps-open" : "steps-closed"} open={stepsOpen} onOpenChange={setStepsOpen} title="Today’s steps" value={steps} unit="steps" onSave={setSteps} />
    </main>
  );
}

function IosToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-[31px] w-[51px] rounded-full p-0.5 transition-colors", checked ? "bg-[#30d158]" : "bg-[#39393d]")}
    >
      <motion.span
        layout
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 620, damping: 38 }}
        className="flex h-[27px] w-[27px] items-center justify-center rounded-full bg-white shadow-lg"
      >
        {checked && <Check size={14} className="text-[#30d158]" strokeWidth={3} />}
      </motion.span>
    </button>
  );
}
