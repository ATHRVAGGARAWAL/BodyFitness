"use client";

import { Activity, Camera, ChevronDown, Plus, Scale, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { LargeTitle } from "@/components/large-title";
import { MetricEntrySheet } from "@/components/metric-entry-sheet";
import { AddPhysiqueSheet } from "@/components/progress/add-physique-sheet";
import { PhysiqueGallery } from "@/components/progress/physique-gallery";
import { ProgressChart } from "@/components/progress/progress-chart";
import { demoProgress } from "@/lib/seed";
import { useBodyFitnessStore } from "@/lib/store";
import {
  bodySignal,
  bodySignalCopy,
  buildProgressSeries,
  formatDelta,
  strengthDeltaPercent,
  weightDelta,
} from "@/lib/training-metrics";

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
  const usingDemo = !weightEntries.length && !setLogs.length;
  const chartData = useMemo(
    () => (usingDemo ? demoProgress() : buildProgressSeries(weightEntries, setLogs, selectedLift?.id)),
    [selectedLift?.id, setLogs, usingDemo, weightEntries],
  );
  const massDelta = useMemo(() => weightDelta(weightEntries), [weightEntries]);
  const strengthDelta = useMemo(() => strengthDeltaPercent(setLogs, selectedLift?.id), [selectedLift?.id, setLogs]);
  const signal = bodySignal(massDelta, strengthDelta);
  const latestWeight = weightEntries[0]?.weightKg ?? profile.currentWeightKg;
  const latestStrength = setLogs
    .filter((log) => log.exerciseId === selectedLift?.id)
    .reduce((best, log) => Math.max(best, log.e1rm), 0);
  const shouldRecalculate = Boolean(weightEntries[0] && Math.abs(latestWeight - profile.currentWeightKg) / profile.currentWeightKg >= 0.02);

  return (
    <main className="page-shell">
      <LargeTitle eyebrow="Longitudinal body data" title="Progress Lab" action={<button aria-label="Add body weight" onClick={() => setWeightOpen(true)} className="profile-button pressable"><Plus size={19} /></button>} />

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <div><div className="mb-1 flex items-center gap-2"><span className="section-index">01</span><span className="section-rule" /></div><h2 className="section-title">Body × strength</h2><p className="section-caption">12-week signal with weekly smoothing.</p></div>
          {usingDemo && <span className="status-chip">Sample data</span>}
        </div>
        <div className="relative mb-3">
          <select aria-label="Select strength lift" value={selectedLift?.id} onChange={(event) => setSelectedLiftId(event.target.value)} className="ios-field h-12 appearance-none pr-10 text-xs font-bold">
            {compoundLifts.map((lift) => <option key={lift.id} value={lift.id}>{lift.name} · estimated 1RM</option>)}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
        </div>
        <ProgressChart data={chartData} />
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat
          icon={<Scale size={18} />}
          label="Body mass"
          value={latestWeight.toFixed(1)}
          unit="kg"
          change={formatDelta(massDelta, " kg")}
          hint="Log twice to see a trend"
          color="var(--steps)"
        />
        <Stat
          icon={<TrendingUp size={18} />}
          label={`${selectedLift?.name ?? "Lift"} e1RM`}
          value={latestStrength ? latestStrength.toFixed(1) : "—"}
          unit={latestStrength ? "kg" : ""}
          change={formatDelta(strengthDelta, "%")}
          hint="Train it twice to see a trend"
          color="var(--accent-strong)"
        />
      </div>

      {shouldRecalculate && (
        <div className="panel mt-3 p-4">
          <div className="flex gap-3"><span className="icon-tile text-[var(--warning)]"><Sparkles size={18} /></span><div><p className="m-0 text-sm font-bold">Target review available</p><p className="mt-1 text-[11px] leading-4 text-white/40">Your weight changed by at least 2%. Recalculate using {latestWeight.toFixed(1)} kg?</p></div></div>
          <button onClick={() => { finishOnboarding({ ...profile, currentWeightKg: latestWeight }); showToast("Targets recalculated"); }} className="primary-action pressable mt-3 min-h-11 w-full rounded-[13px] text-xs font-black">Recalculate targets</button>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between px-1">
          <div><div className="mb-1 flex items-center gap-2"><span className="section-index">02</span><span className="section-rule" /></div><h2 className="section-title">Physique timeline</h2><p className="section-caption">Repeatable angles. Honest comparison.</p></div>
          <button onClick={() => setPhysiqueOpen(true)} className="icon-button pressable" aria-label="Add physique check-in"><Camera size={17} /></button>
        </div>
        <PhysiqueGallery entries={physiqueWeeks} onAdd={() => setPhysiqueOpen(true)} />
      </section>

      {signal && (
        <div className="panel mt-4 flex min-h-[72px] items-center gap-3 px-4">
          <span className="icon-tile text-[var(--protein)]"><Activity size={18} /></span>
          <div><p className="m-0 text-sm font-bold">{bodySignalCopy[signal].title}</p><p className="mt-1 text-[10px] text-white/32">{bodySignalCopy[signal].detail}</p></div>
        </div>
      )}

      <MetricEntrySheet open={weightOpen} onOpenChange={setWeightOpen} title="Log body weight" value={latestWeight} unit="kg" onSave={(weight) => { addWeightEntry(weight); showToast("Weight logged"); }} />
      <AddPhysiqueSheet key={physiqueOpen ? "physique-open" : "physique-closed"} open={physiqueOpen} onOpenChange={setPhysiqueOpen} />
    </main>
  );
}

function Stat({ icon, label, value, unit, change, hint, color }: { icon: React.ReactNode; label: string; value: string; unit: string; change: string | null; hint: string; color: string }) {
  return <div className="panel p-4"><span className="icon-tile" style={{ color }}>{icon}</span><p className="mb-1 mt-4 text-[9px] font-black uppercase tracking-[0.07em] text-white/30">{label}</p><p className="number-font m-0 text-[26px] font-black">{value}{unit && <span className="ml-1 text-[9px] tracking-normal text-white/28">{unit}</span>}</p>{change ? <p className="mt-1 text-[9px] font-bold" style={{ color }}>{change}</p> : <p className="mt-1 text-[9px] font-semibold text-white/25">{hint}</p>}</div>;
}
