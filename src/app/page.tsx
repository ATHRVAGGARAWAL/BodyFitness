"use client";

import { motion } from "framer-motion";
import { Check, ChevronRight, Droplets, Flame, Footprints, UserRound, Utensils } from "lucide-react";
import Link from "next/link";
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
  const proteinRemaining = Math.max(0, targets.proteinG - totals.proteinG);
  const waterRemaining = Math.max(0, targets.waterMl - water);
  const stepsRemaining = Math.max(0, targets.steps - steps);
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
          <button aria-label="Open profile" onClick={() => setSettingsOpen(true)} className="profile-button pressable">
            <UserRound size={21} strokeWidth={2.25} />
          </button>
        }
      />

      <div className="mb-3 flex items-center justify-between px-1">
        <p className="m-0 text-[13px] font-semibold text-white/50">Activity</p>
        {usingDemo && <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white/35">Sample data</span>}
      </div>
      <ActivityRings
        calories={totals.calories}
        calorieTarget={targets.calories}
        protein={totals.proteinG}
        proteinTarget={targets.proteinG}
        steps={steps}
        stepTarget={targets.steps}
        onEditSteps={() => setStepsOpen(true)}
      />

      <NextAction
        proteinRemaining={proteinRemaining}
        waterRemaining={waterRemaining}
        stepsRemaining={stepsRemaining}
        onAddWater={() => addWater(250)}
        onEditSteps={() => setStepsOpen(true)}
      />

      <section className="mt-8">
        <SectionHeader title="Daily essentials" caption="The few actions that keep your plan moving." />

        <div className="grid grid-cols-2 gap-3">
          <div className="health-card flex min-h-[176px] flex-col justify-between p-4">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#bf5af2]/14 text-[#bf5af2]">
                <span className="number-font text-[12px] font-black">5g</span>
              </div>
              <IosToggle checked={daily?.creatineTaken ?? false} onChange={setCreatine} />
            </div>
            <div>
              <p className="m-0 text-[17px] font-bold">Creatine</p>
              <p className="mt-1 text-[11px] text-white/38">{daily?.creatineTaken ? "Logged today" : "Maintain saturation"}</p>
            </div>
          </div>
          <WaterGauge valueMl={water} targetMl={targets.waterMl} onChange={addWater} />
        </div>

        <div className="mt-3">
          <HabitList habits={habits} completedIds={completedHabitIds} onToggle={toggleHabit} />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader title="Nutrition highlight" caption="Your recent pattern, without overreacting to one day." />
        <AdaptiveCard insight={insight} target={targets.calories} demo={usingDemo} isFlexDay={flexDays.includes(today)} onToggleFlexDay={() => toggleFlexDay(today)} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <h2 className="section-title">Today’s food</h2>
            <p className="section-caption">Meals added to your activity rings.</p>
          </div>
          <span className="number-font text-xs font-semibold text-white/35">{formatNumber(totals.proteinG)}g protein</span>
        </div>
        <div className="health-card overflow-hidden">
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
      className="flex h-11 w-[55px] items-center justify-center"
    >
      <span className={cn("relative block h-[31px] w-[51px] rounded-full p-0.5 transition-colors", checked ? "bg-[#30d158]" : "toggle-off")}>
        <motion.span
          layout
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 620, damping: 38 }}
          className="flex h-[27px] w-[27px] items-center justify-center rounded-full bg-white shadow-lg"
        >
          {checked && <Check size={14} className="text-[#30d158]" strokeWidth={3} />}
        </motion.span>
      </span>
    </button>
  );
}

function SectionHeader({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="mb-3 px-1">
      <h2 className="section-title">{title}</h2>
      <p className="section-caption">{caption}</p>
    </div>
  );
}

function NextAction({
  proteinRemaining,
  waterRemaining,
  stepsRemaining,
  onAddWater,
  onEditSteps,
}: {
  proteinRemaining: number;
  waterRemaining: number;
  stepsRemaining: number;
  onAddWater: () => void;
  onEditSteps: () => void;
}) {
  if (proteinRemaining > 0) {
    return (
      <div className="health-card mt-3 flex min-h-[78px] items-center gap-3 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#b6ff2e]/12 text-[#b6ff2e]"><Utensils size={19} /></span>
        <div className="min-w-0 flex-1"><p className="m-0 text-sm font-semibold">Prioritize protein next</p><p className="mt-1 text-[11px] text-white/38">{formatNumber(proteinRemaining)}g remaining today</p></div>
        <Link href="/snap-diet" className="pressable flex min-h-11 items-center rounded-full bg-white px-3.5 text-[11px] font-bold text-black">Log food</Link>
      </div>
    );
  }
  if (waterRemaining > 0) {
    return (
      <div className="health-card mt-3 flex min-h-[78px] items-center gap-3 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#64d2ff]/12 text-[#64d2ff]"><Droplets size={19} /></span>
        <div className="min-w-0 flex-1"><p className="m-0 text-sm font-semibold">Hydration is next</p><p className="mt-1 text-[11px] text-white/38">{(waterRemaining / 1_000).toFixed(1)}L remaining today</p></div>
        <button onClick={onAddWater} className="pressable min-h-11 rounded-full bg-white px-3.5 text-[11px] font-bold text-black">+250 ml</button>
      </div>
    );
  }
  if (stepsRemaining > 0) {
    return (
      <div className="health-card mt-3 flex min-h-[78px] items-center gap-3 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#64d2ff]/12 text-[#64d2ff]"><Footprints size={19} /></span>
        <div className="min-w-0 flex-1"><p className="m-0 text-sm font-semibold">Keep moving</p><p className="mt-1 text-[11px] text-white/38">{formatNumber(stepsRemaining)} steps to your goal</p></div>
        <button onClick={onEditSteps} className="pressable min-h-11 rounded-full bg-white px-3.5 text-[11px] font-bold text-black">Update</button>
      </div>
    );
  }
  return (
    <div className="health-card mt-3 flex min-h-[78px] items-center gap-3 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#30d158]/12 text-[#30d158]"><Check size={19} /></span>
      <div><p className="m-0 text-sm font-semibold">Core targets complete</p><p className="mt-1 text-[11px] text-white/38">Keep the rest of the day steady.</p></div>
    </div>
  );
}
