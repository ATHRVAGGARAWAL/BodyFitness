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
  const profile = useBodyFitnessStore((state) => state.profile);
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
        title={`Hi, ${profile.currentWeightKg ? "Athlete" : "there"}`}
        action={
          <button aria-label="Open settings" onClick={() => setSettingsOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white/70">
            <Settings2 size={19} />
          </button>
        }
      />

      <div className="mb-3 flex items-center justify-between px-1">
        <p className="m-0 text-[13px] font-semibold text-white/42">Your rings</p>
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

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between px-1">
          <div>
            <p className="m-0 text-[20px] font-bold tracking-[-0.03em]">Daily non-negotiables</p>
            <p className="mt-1 text-xs text-white/34">Small actions, repeated.</p>
          </div>
          <Sparkles size={18} className="text-[#bf5af2]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="ios-card flex min-h-[154px] flex-col justify-between p-4">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#bf5af2]/15 text-[#bf5af2]">
                <span className="number-font text-[12px] font-black">5g</span>
              </div>
              <IosToggle checked={daily?.creatineTaken ?? false} onChange={setCreatine} />
            </div>
            <div>
              <p className="m-0 text-[17px] font-bold">Creatine</p>
              <p className="mt-1 text-[11px] text-white/36">Daily saturation</p>
            </div>
          </div>
          <WaterGauge valueMl={water} targetMl={targets.waterMl} onChange={addWater} />
        </div>

        <div className="mt-3">
          <HabitList habits={habits} completedIds={completedHabitIds} onToggle={toggleHabit} />
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 px-1">
          <p className="m-0 text-[20px] font-bold tracking-[-0.03em]">Adaptive nutrition</p>
          <p className="mt-1 text-xs text-white/34">Trend over guilt.</p>
        </div>
        <AdaptiveCard insight={insight} target={targets.calories} demo={usingDemo} isFlexDay={flexDays.includes(today)} onToggleFlexDay={() => toggleFlexDay(today)} />
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="m-0 text-[20px] font-bold tracking-[-0.03em]">Today’s food</p>
          <span className="number-font text-xs font-semibold text-white/35">{formatNumber(totals.proteinG)}g protein</span>
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
