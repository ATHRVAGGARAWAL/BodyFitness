"use client";

import { motion } from "framer-motion";
import { Activity, BarChart3, CalendarDays, ChevronRight, Pencil, TimerReset, Trophy } from "lucide-react";
import { useState } from "react";
import { LargeTitle } from "@/components/large-title";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { WorkoutEditorSheet } from "@/components/workout/workout-editor-sheet";
import { useAppChrome } from "@/components/app-shell";
import { useBodyFitnessStore } from "@/lib/store";

export default function WorkoutPage() {
  const plan = useBodyFitnessStore((state) => state.workoutPlan);
  const setWorkoutPlan = useBodyFitnessStore((state) => state.setWorkoutPlan);
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const [selectedDayId, setSelectedDayId] = useState(plan[0]?.id ?? "");
  const [editorOpen, setEditorOpen] = useState(false);
  const { showToast } = useAppChrome();
  const selectedDay = plan.find((day) => day.id === selectedDayId) ?? plan[0];
  const prCount = setLogs.filter((log) => log.isPr).length;

  return (
    <main className="page-shell">
      <LargeTitle
        eyebrow="Adaptive training system"
        title="Training Lab"
        action={<button onClick={() => setEditorOpen(true)} className="profile-button pressable" aria-label="Edit workout split"><Pencil size={19} /></button>}
      />

      <section className="panel overflow-hidden p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="page-kicker"><CalendarDays size={12} /> Weekly protocol</div>
            <p className="number-font mb-0 mt-3 text-[34px] font-black leading-none">03<span className="ml-1 text-[15px] font-bold tracking-normal text-white/30">/05</span></p>
            <p className="mt-2 text-[11px] text-white/36">Sessions completed this cycle</p>
          </div>
          <div className="data-tile flex min-w-[112px] flex-col items-end p-3">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--success)]"><Activity size={12} /> On pace</span>
            <p className="number-font mb-0 mt-3 text-[25px] font-black">68<span className="ml-1 text-[10px] tracking-normal text-white/32">min</span></p>
            <p className="mt-1 text-[9px] text-white/28">avg session</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-5 gap-1.5">
          {plan.map((day, index) => (
            <div key={day.id} className="space-y-1.5 text-center">
              <span className={`block h-1.5 rounded-full ${index < 3 ? "bg-[var(--accent)]" : "bg-[var(--fill)]"}`} />
              <span className="text-[8px] font-black uppercase tracking-[0.04em] text-white/25">{day.name.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {plan.map((day, index) => {
          const active = day.id === selectedDay?.id;
          return (
            <button key={day.id} onClick={() => setSelectedDayId(day.id)} className={`pressable relative min-h-[62px] min-w-[104px] overflow-hidden rounded-[17px] border px-3 text-left ${active ? "border-[color-mix(in_srgb,var(--accent)_48%,transparent)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-white/42"}`}>
              {active && <motion.span layoutId="workout-day" className="absolute inset-0 bg-[var(--accent-soft)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative block font-mono text-[8px] font-black tracking-[0.08em] text-white/30">0{index + 1}</span>
              <span className="relative mt-1 block text-[13px] font-bold">{day.name}</span>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <section className="mt-7">
          <SectionHeader index="01" title={`${selectedDay.name} protocol`} caption={`${selectedDay.exercises.length} movements · tap a module to log`} />
          <div className="space-y-3">
            {selectedDay.exercises.map((exercise, index) => <ExerciseCard key={exercise.id} exercise={exercise} dayId={selectedDay.id} index={index} />)}
          </div>
        </section>
      )}

      <section className="mt-8">
        <SectionHeader index="02" title="Training signals" caption="Useful feedback without dashboard noise." />
        <div className="grid grid-cols-2 gap-3">
          <Insight icon={<Trophy size={18} />} label="PR output" value={String(prCount || 4)} note="sets" color="var(--success)" />
          <Insight icon={<TimerReset size={18} />} label="Rest control" value="92" note="score" color="var(--steps)" />
        </div>
        <button className="panel pressable mt-3 flex min-h-[72px] w-full items-center gap-3 px-4 text-left">
          <span className="icon-tile text-[var(--accent-strong)]"><BarChart3 size={18} /></span>
          <div className="flex-1"><p className="m-0 text-sm font-bold">Overload detection active</p><p className="mt-1 text-[10px] text-white/32">A PR requires a 1%+ e1RM improvement.</p></div>
          <ChevronRight size={16} className="text-white/18" />
        </button>
      </section>

      <WorkoutEditorSheet key={editorOpen ? "editor-open" : "editor-closed"} open={editorOpen} onOpenChange={setEditorOpen} plan={plan} onSave={(next) => { setWorkoutPlan(next); showToast("Training protocol updated"); }} />
    </main>
  );
}

function SectionHeader({ index, title, caption }: { index: string; title: string; caption: string }) {
  return <div className="mb-3 px-1"><div className="mb-1 flex items-center gap-2"><span className="section-index">{index}</span><span className="section-rule" /></div><h2 className="section-title">{title}</h2><p className="section-caption">{caption}</p></div>;
}

function Insight({ icon, label, value, note, color }: { icon: React.ReactNode; label: string; value: string; note: string; color: string }) {
  return <div className="panel p-4"><span className="icon-tile" style={{ color }}>{icon}</span><p className="mb-1 mt-5 text-[10px] font-bold uppercase tracking-[0.07em] text-white/30">{label}</p><p className="number-font m-0 text-[28px] font-black" style={{ color }}>{value}<span className="ml-1 text-[9px] font-bold tracking-normal text-white/28">{note}</span></p></div>;
}
