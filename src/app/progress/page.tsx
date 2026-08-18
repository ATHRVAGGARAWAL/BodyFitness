"use client";

import { Camera, ChevronDown, Plus, Scale, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { LargeTitle } from "@/components/large-title";
import { MetricEntrySheet } from "@/components/metric-entry-sheet";
import { AddPhysiqueSheet } from "@/components/progress/add-physique-sheet";
import { PhysiqueGallery } from "@/components/progress/physique-gallery";
import { ProgressChart } from "@/components/progress/progress-chart";
import { formatShortDate, localDateKey, shiftDate, startOfWeek } from "@/lib/date";
import { demoProgress } from "@/lib/seed";
import { useBodyFitnessStore } from "@/lib/store";
import type { ProgressPoint } from "@/lib/types";

export default function ProgressPage() {
  const profile = useBodyFitnessStore((state) => state.profile);
  const weightEntries = useBodyFitnessStore((state) => state.weightEntries);
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const workoutPlan = useBodyFitnessStore((state) => state.workoutPlan);
  const selectedLiftId = useBodyFitnessStore((state) => state.selectedLiftId);
  const setSelectedLiftId = useBodyFitnessStore((state) => state.setSelectedLiftId);
  const addWeightEntry = useBodyFitnessStore((state) => state.addWeightEntry);
  const finishOnboarding = useBodyFitnessStore((state) => state.finishOnboarding);
  const physiqueWeeks = useBodyFitnessStore((state) => state.physiqueWeeks);
  const [weightOpen, setWeightOpen] = useState(false);
  const [physiqueOpen, setPhysiqueOpen] = useState(false);
  const { showToast } = useAppChrome();

  const compoundLifts = useMemo(() => {
    const unique = new Map<string, string>();
    workoutPlan.flatMap((day) => day.exercises).filter((exercise) => exercise.type === "compound").forEach((exercise) => unique.set(exercise.id, exercise.name));
    return [...unique.entries()].map(([id, name]) => ({ id, name }));
  }, [workoutPlan]);
  const selectedLift = compoundLifts.find((lift) => lift.id === selectedLiftId) ?? compoundLifts[0];
  const chartData = useMemo(() => buildProgress(weightEntries, setLogs, selectedLift?.id, profile.currentWeightKg), [profile.currentWeightKg, selectedLift?.id, setLogs, weightEntries]);
  const latestWeight = weightEntries[0]?.weightKg ?? profile.currentWeightKg;
  const shouldRecalculate = Boolean(weightEntries[0] && Math.abs(latestWeight - profile.currentWeightKg) / profile.currentWeightKg >= 0.02);

  return (
    <main className="page-shell">
      <LargeTitle eyebrow="Recomposition" title="Progress" action={<button onClick={() => setWeightOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white/70"><Plus size={19} /></button>} />

      <div className="mb-3 flex items-center justify-between px-1">
        <div><p className="m-0 text-[20px] font-bold tracking-[-0.03em]">Body vs strength</p><p className="mt-1 text-xs text-white/34">Weekly averages smooth out noise.</p></div>
        {!weightEntries.length && <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white/35">Sample</span>}
      </div>

      <div className="relative mb-3">
        <select aria-label="Select strength lift" value={selectedLift?.id} onChange={(event) => setSelectedLiftId(event.target.value)} className="h-11 w-full appearance-none rounded-[15px] border-0 bg-white/[0.065] px-4 text-xs font-semibold outline-none">
          {compoundLifts.map((lift) => <option key={lift.id} value={lift.id}>{lift.name} estimated 1RM</option>)}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
      </div>
      <ProgressChart data={chartData} />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat icon={<Scale size={18} />} label="Current weight" value={`${latestWeight.toFixed(1)} kg`} change="−1.6 kg / 8 wk" color="#64d2ff" />
        <Stat icon={<TrendingUp size={18} />} label={`${selectedLift?.name ?? "Lift"} e1RM`} value={`${chartData.at(-1)?.e1rm.toFixed(1)} kg`} change="+8.4% / 12 wk" color="#bf5af2" />
      </div>

      {shouldRecalculate && (
        <div className="mt-3 rounded-[20px] bg-[#ffd60a]/10 p-4">
          <div className="flex gap-3"><Sparkles size={19} className="shrink-0 text-[#ffd60a]" /><div><p className="m-0 text-sm font-semibold">Your weight has shifted</p><p className="mt-1 text-[11px] leading-4 text-white/40">Recalculate nutrition targets using {latestWeight.toFixed(1)} kg? Nothing changes until you accept.</p></div></div>
          <button onClick={() => { finishOnboarding({ ...profile, currentWeightKg: latestWeight }); showToast("Targets recalculated"); }} className="mt-3 min-h-11 w-full rounded-[14px] bg-[#ffd60a] text-xs font-bold text-black">Use latest weight</button>
        </div>
      )}

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between px-1">
          <div><p className="m-0 text-[20px] font-bold tracking-[-0.03em]">Physique gallery</p><p className="mt-1 text-xs text-white/34">Same poses. Honest comparison.</p></div>
          <button onClick={() => setPhysiqueOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07]"><Camera size={17} /></button>
        </div>
        <PhysiqueGallery entries={physiqueWeeks} onAdd={() => setPhysiqueOpen(true)} />
      </section>

      <MetricEntrySheet open={weightOpen} onOpenChange={setWeightOpen} title="Log body weight" value={latestWeight} unit="kg" onSave={(weight) => { addWeightEntry(weight); showToast("Weight logged"); }} />
      <AddPhysiqueSheet key={physiqueOpen ? "physique-open" : "physique-closed"} open={physiqueOpen} onOpenChange={setPhysiqueOpen} />
    </main>
  );
}

function Stat({ icon, label, value, change, color }: { icon: React.ReactNode; label: string; value: string; change: string; color: string }) {
  return <div className="ios-card p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `${color}18`, color }}>{icon}</span><p className="mb-1 mt-4 text-[10px] font-semibold text-white/35">{label}</p><p className="number-font m-0 text-[22px] font-bold">{value}</p><p className="mt-1 text-[9px] font-semibold" style={{ color }}>{change}</p></div>;
}

function buildProgress(weightEntries: ReturnType<typeof useBodyFitnessStore.getState>["weightEntries"], setLogs: ReturnType<typeof useBodyFitnessStore.getState>["setLogs"], liftId: string | undefined, fallbackWeight: number): ProgressPoint[] {
  if (!weightEntries.length && !setLogs.length) return demoProgress();
  const today = localDateKey();
  return Array.from({ length: 12 }, (_, index) => {
    const weekDate = shiftDate(today, -(11 - index) * 7);
    const week = startOfWeek(new Date(`${weekDate}T12:00:00`));
    const nextWeek = shiftDate(week, 7);
    const weights = weightEntries.filter((entry) => entry.date >= week && entry.date < nextWeek).map((entry) => entry.weightKg);
    const lifts = setLogs.filter((log) => log.exerciseId === liftId && localDateKey(log.completedAt) >= week && localDateKey(log.completedAt) < nextWeek).map((log) => log.e1rm);
    const previous = index > 0 ? undefined : fallbackWeight;
    return {
      date: week,
      week: formatShortDate(week),
      weight: Number((weights.length ? weights.reduce((sum, value) => sum + value, 0) / weights.length : previous ?? fallbackWeight - index * 0.05).toFixed(1)),
      e1rm: Number((lifts.length ? Math.max(...lifts) : 76 + index * 0.55).toFixed(1)),
    };
  });
}
