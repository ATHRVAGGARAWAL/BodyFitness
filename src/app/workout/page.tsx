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
        action={<button onClick={() => setEditorOpen(true)} className="icon-button pressable" aria-label="Edit workout split"><Pencil size={18} /></button>}
      />

      <div className="hero-surface mb-5 overflow-hidden p-5">
        <div aria-hidden className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-[#ff375f]/14 blur-[64px]" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="section-kicker m-0 flex items-center gap-1.5"><CalendarDays size={12} /> Weekly consistency</p>
            <p className="number-font mb-0 mt-3 text-[40px] font-bold leading-none">3<span className="text-[18px] tracking-normal text-white/28">/5</span></p>
            <p className="mt-2 text-[11px] text-white/38">Two sessions to close your week.</p>
          </div>
          <div className="relative flex h-[86px] w-[86px] items-center justify-center">
            <svg viewBox="0 0 88 88" className="absolute inset-0 -rotate-90">
              <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8" />
              <motion.circle cx="44" cy="44" r="36" fill="none" stroke="#ff375f" strokeWidth="8" strokeLinecap="round" strokeDasharray={226.2} initial={{ strokeDashoffset: 226.2 }} animate={{ strokeDashoffset: 226.2 * 0.4 }} transition={{ type: "spring", stiffness: 65, damping: 17 }} className="drop-shadow-[0_0_8px_#ff375f]" />
            </svg>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff375f]/10 text-[#ff375f]">
              <Flame size={24} fill="currentColor" />
            </div>
            <span className="absolute -right-1 top-0 rounded-full bg-[#ff9f0a] px-1.5 py-0.5 text-[9px] font-black text-black shadow-[0_0_18px_rgba(255,159,10,.45)]">6</span>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-5 gap-2 rounded-[18px] bg-black/20 p-2.5 ring-1 ring-white/[0.055]">
          {plan.map((day, index) => (
            <div key={day.id} className="flex flex-col items-center gap-1.5">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold ${index < 3 ? "bg-[#ff375f] text-white shadow-[0_0_14px_rgba(255,55,95,.32)]" : "bg-white/[0.055] text-white/28"}`}>{index < 3 ? "✓" : index + 1}</span>
              <span className="max-w-full truncate text-[8px] font-semibold text-white/28">{day.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {plan.map((day) => (
          <button key={day.id} onClick={() => setSelectedDayId(day.id)} className={`capsule-control pressable relative min-h-12 min-w-[92px] overflow-hidden px-4 text-sm font-semibold ${day.id === selectedDay?.id ? "text-black" : "text-white/42"}`}>
            {day.id === selectedDay?.id && <motion.span layoutId="workout-day" className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${day.accent}, ${day.accent}c7)` }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative z-10">{day.name}</span>
          </button>
        ))}
      </div>

      {selectedDay && (
        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between px-1">
            <div><p className="section-kicker m-0">Today’s programme</p><p className="mb-0 mt-1 text-[22px] font-bold tracking-[-0.035em]">{selectedDay.name} session</p></div>
            <span className="capsule-control number-font flex h-8 items-center px-3 text-[10px] font-bold" style={{ color: selectedDay.accent }}>~68 min</span>
          </div>
          <p className="mb-3 mt-0 px-1 text-[11px] text-white/30">{selectedDay.exercises.length} exercises · tap a card to log</p>
          <div className="space-y-3">
            {selectedDay.exercises.map((exercise, index) => <ExerciseCard key={exercise.id} exercise={exercise} dayId={selectedDay.id} index={index} />)}
          </div>
        </section>
      )}

      <section className="mt-7">
        <div className="mb-3 px-1"><p className="section-kicker m-0">Signals</p><p className="mb-0 mt-1 text-[21px] font-bold tracking-[-0.035em]">Training intelligence</p></div>
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
  return <div className="ios-card overflow-hidden p-4"><span aria-hidden className="absolute -right-9 -top-9 h-24 w-24 rounded-full blur-[35px]" style={{ background: `${color}24` }} /><span className="relative flex h-9 w-9 items-center justify-center rounded-[14px] ring-1 ring-white/[0.06]" style={{ background: `${color}18`, color }}>{icon}</span><p className="relative mb-1 mt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30">{label}</p><p className="number-font relative m-0 text-[29px] font-bold" style={{ color }}>{value}</p></div>;
}
