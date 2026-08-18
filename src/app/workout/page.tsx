"use client";

import { motion } from "framer-motion";
import { CalendarDays, ChevronRight, Flame, Pencil, TimerReset, Trophy } from "lucide-react";
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

  return (
    <main className="page-shell">
      <LargeTitle
        eyebrow="Five-day PPLUL"
        title="Workout"
        action={<button onClick={() => setEditorOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white/70" aria-label="Edit workout split"><Pencil size={18} /></button>}
      />

      <div className="ios-card mb-5 overflow-hidden p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="m-0 flex items-center gap-1.5 text-[11px] font-semibold text-white/38"><CalendarDays size={13} /> This week</p>
            <p className="number-font mb-0 mt-2 text-[30px] font-bold leading-none">3 <span className="text-sm tracking-normal text-white/30">of 5 days</span></p>
          </div>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#ff375f]/12 text-[#ff375f]">
            <Flame size={27} fill="currentColor" />
            <span className="absolute -right-1 -top-1 rounded-full bg-[#ff9f0a] px-1.5 py-0.5 text-[9px] font-black text-black">6</span>
          </div>
        </div>
        <div className="mt-4 flex gap-1.5">
          {plan.map((day, index) => <span key={day.id} className={`h-1.5 flex-1 rounded-full ${index < 3 ? "bg-[#ff375f]" : "bg-white/10"}`} />)}
        </div>
      </div>

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {plan.map((day) => (
          <button key={day.id} onClick={() => setSelectedDayId(day.id)} className={`relative min-h-12 min-w-[92px] overflow-hidden rounded-full px-4 text-sm font-semibold ${day.id === selectedDay?.id ? "text-black" : "bg-white/[0.065] text-white/48"}`}>
            {day.id === selectedDay?.id && <motion.span layoutId="workout-day" className="absolute inset-0" style={{ background: day.accent }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative">{day.name}</span>
          </button>
        ))}
      </div>

      {selectedDay && (
        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between px-1">
            <div><p className="m-0 text-[22px] font-bold tracking-[-0.035em]">{selectedDay.name} session</p><p className="mt-1 text-xs text-white/34">{selectedDay.exercises.length} exercises · tap a card to log</p></div>
            <span className="number-font text-xs font-bold" style={{ color: selectedDay.accent }}>~68 min</span>
          </div>
          <div className="space-y-3">
            {selectedDay.exercises.map((exercise, index) => <ExerciseCard key={exercise.id} exercise={exercise} dayId={selectedDay.id} index={index} />)}
          </div>
        </section>
      )}

      <section className="mt-7">
        <div className="mb-3 px-1"><p className="m-0 text-[20px] font-bold tracking-[-0.03em]">Training intelligence</p><p className="mt-1 text-xs text-white/34">Quiet signals, not noisy dashboards.</p></div>
        <div className="grid grid-cols-2 gap-3">
          <Insight icon={<Trophy size={18} />} label="PR sets" value={String(setLogs.filter((log) => log.isPr).length || 4)} color="#30d158" />
          <Insight icon={<TimerReset size={18} />} label="Rest quality" value="92%" color="#64d2ff" />
        </div>
        <button className="pressable mt-3 flex min-h-14 w-full items-center gap-3 rounded-[20px] bg-white/[0.055] px-4 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#bf5af2]/13 text-[#bf5af2]"><Flame size={17} /></span>
          <div className="flex-1"><p className="m-0 text-sm font-semibold">Progressive overload is on</p><p className="mt-0.5 text-[10px] text-white/30">Green sets beat your previous e1RM by 1%+</p></div>
          <ChevronRight size={16} className="text-white/18" />
        </button>
      </section>

      <WorkoutEditorSheet key={editorOpen ? "editor-open" : "editor-closed"} open={editorOpen} onOpenChange={setEditorOpen} plan={plan} onSave={(next) => { setWorkoutPlan(next); showToast("Workout split updated"); }} />
    </main>
  );
}

function Insight({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return <div className="ios-card p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `${color}18`, color }}>{icon}</span><p className="mt-5 mb-1 text-[11px] font-semibold text-white/35">{label}</p><p className="number-font m-0 text-[27px] font-bold" style={{ color }}>{value}</p></div>;
}
