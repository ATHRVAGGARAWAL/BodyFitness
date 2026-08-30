"use client";

import { motion } from "framer-motion";
import { Activity, BarChart3, CalendarDays, ChevronRight, Pencil, Play, Square, TimerReset, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LargeTitle } from "@/components/large-title";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { WorkoutEditorSheet } from "@/components/workout/workout-editor-sheet";
import { useAppChrome } from "@/components/app-shell";
import { useBodyFitnessStore } from "@/lib/store";
import {
  activeSession,
  averageSessionMinutes,
  restAdherence,
  sessionVolumeKg,
  weeklyCycle,
} from "@/lib/training-metrics";
import { formatNumber } from "@/lib/utils";

export default function WorkoutPage() {
  const plan = useBodyFitnessStore((state) => state.workoutPlan);
  const setWorkoutPlan = useBodyFitnessStore((state) => state.setWorkoutPlan);
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const sessions = useBodyFitnessStore((state) => state.sessions);
  const activeSessionId = useBodyFitnessStore((state) => state.activeSessionId);
  const startSession = useBodyFitnessStore((state) => state.startSession);
  const finishSession = useBodyFitnessStore((state) => state.finishSession);
  const closeStaleSessions = useBodyFitnessStore((state) => state.closeStaleSessions);
  const [selectedDayId, setSelectedDayId] = useState(plan[0]?.id ?? "");
  const [editorOpen, setEditorOpen] = useState(false);
  const { showToast } = useAppChrome();
  const selectedDay = plan.find((day) => day.id === selectedDayId) ?? plan[0];

  useEffect(() => {
    closeStaleSessions();
  }, [closeStaleSessions]);

  const cycle = useMemo(() => weeklyCycle(sessions, plan), [plan, sessions]);
  const averageMinutes = useMemo(() => averageSessionMinutes(sessions), [sessions]);
  const rest = useMemo(() => restAdherence(setLogs), [setLogs]);
  const current = useMemo(() => activeSession(sessions, activeSessionId), [activeSessionId, sessions]);
  const prCount = setLogs.filter((log) => log.isPr).length;
  const onPace = cycle.planned > 0 && cycle.completed >= Math.ceil(cycle.planned * 0.6);

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
            <p className="number-font mb-0 mt-3 text-[34px] font-black leading-none">
              {String(cycle.completed).padStart(2, "0")}
              <span className="ml-1 text-[15px] font-bold tracking-normal text-white/30">/{String(cycle.planned).padStart(2, "0")}</span>
            </p>
            <p className="mt-2 text-[11px] text-white/36">Plan days trained this week</p>
          </div>
          <div className="data-tile flex min-w-[112px] flex-col items-end p-3">
            {cycle.completed > 0 && (
              <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em] ${onPace ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                <Activity size={12} /> {onPace ? "On pace" : "Behind"}
              </span>
            )}
            <p className="number-font mb-0 mt-3 text-[25px] font-black">
              {averageMinutes === null ? "—" : averageMinutes}
              {averageMinutes !== null && <span className="ml-1 text-[10px] tracking-normal text-white/32">min</span>}
            </p>
            <p className="mt-1 text-[9px] text-white/28">{averageMinutes === null ? "no finished sessions" : "avg session"}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, plan.length)}, minmax(0, 1fr))` }}>
          {plan.map((day) => {
            const trained = cycle.completedDayIds.includes(day.id);
            return (
              <div key={day.id} className="space-y-1.5 text-center">
                <span className={`block h-1.5 rounded-full ${trained ? "bg-[var(--accent)]" : "bg-[var(--fill)]"}`} />
                <span className="text-[8px] font-black uppercase tracking-[0.04em] text-white/25">{day.name.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {selectedDay && (
        <SessionStrip
          key={current?.id ?? "idle"}
          session={current}
          setLogs={setLogs}
          dayName={selectedDay.name}
          onStart={() => {
            if (startSession(selectedDay.id)) showToast(`${selectedDay.name} session started`);
          }}
          onFinish={() => {
            finishSession();
            showToast("Session finished");
          }}
        />
      )}

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
          <Insight
            icon={<Trophy size={18} />}
            label="PR output"
            value={setLogs.length ? String(prCount) : "—"}
            note={setLogs.length ? (prCount === 1 ? "set" : "sets") : "no sets logged"}
            color="var(--success)"
          />
          <Insight
            icon={<TimerReset size={18} />}
            label="Rest control"
            value={rest.score === null ? "—" : String(rest.score)}
            note={rest.score === null ? `${rest.observations} of 3 rests` : "% on target"}
            color="var(--steps)"
          />
        </div>
        <div className="panel mt-3 flex min-h-[72px] w-full items-center gap-3 px-4 text-left">
          <span className="icon-tile text-[var(--accent-strong)]"><BarChart3 size={18} /></span>
          <div className="flex-1">
            <p className="m-0 text-sm font-bold">Overload detection active</p>
            <p className="mt-1 text-[10px] text-white/32">
              {rest.medianSeconds === null
                ? "A PR requires a 1%+ e1RM improvement over the same set."
                : `Median rest ${formatDuration(rest.medianSeconds)} across ${rest.observations} measured rests.`}
            </p>
          </div>
          <ChevronRight size={16} className="text-white/18" />
        </div>
      </section>

      <WorkoutEditorSheet key={editorOpen ? "editor-open" : "editor-closed"} open={editorOpen} onOpenChange={setEditorOpen} plan={plan} onSave={(next) => { setWorkoutPlan(next); showToast("Training protocol updated"); }} />
    </main>
  );
}

function SessionStrip({
  session,
  setLogs,
  dayName,
  onStart,
  onFinish,
}: {
  session: ReturnType<typeof activeSession>;
  setLogs: ReturnType<typeof useBodyFitnessStore.getState>["setLogs"];
  dayName: string;
  onStart: () => void;
  onFinish: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [session]);

  if (!session) {
    return (
      <button onClick={onStart} className="panel pressable mt-3 flex min-h-[72px] w-full items-center gap-3 px-4 text-left">
        <span className="icon-tile text-[var(--accent-strong)]"><Play size={18} /></span>
        <div className="flex-1">
          <p className="m-0 text-sm font-bold">Start {dayName} session</p>
          <p className="mt-1 text-[10px] text-white/32">Timing a session records its real duration.</p>
        </div>
        <ChevronRight size={16} className="text-white/18" />
      </button>
    );
  }

  const elapsed = Math.max(0, Math.floor((now - Date.parse(session.startedAt)) / 1_000));
  const completed = setLogs.filter((log) => log.sessionId === session.id).length;
  const volume = sessionVolumeKg(session.id, setLogs);

  return (
    <div className="panel mt-3 flex min-h-[72px] items-center gap-3 px-4 py-3">
      <span className="icon-tile text-[var(--success)]"><Activity size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[var(--success)]">Live · {session.dayName}</p>
        <p className="number-font mt-1 text-[17px] font-black leading-none">{formatDuration(elapsed)}</p>
        <p className="mt-1.5 text-[10px] text-white/32">{completed} {completed === 1 ? "set" : "sets"} · {formatNumber(Math.round(volume))} kg volume</p>
      </div>
      <button onClick={onFinish} className="secondary-action pressable flex min-h-11 items-center gap-1.5 rounded-[13px] px-3.5 text-[10px] font-black">
        <Square size={12} /> Finish
      </button>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function SectionHeader({ index, title, caption }: { index: string; title: string; caption: string }) {
  return <div className="mb-3 px-1"><div className="mb-1 flex items-center gap-2"><span className="section-index">{index}</span><span className="section-rule" /></div><h2 className="section-title">{title}</h2><p className="section-caption">{caption}</p></div>;
}

function Insight({ icon, label, value, note, color }: { icon: React.ReactNode; label: string; value: string; note: string; color: string }) {
  return <div className="panel p-4"><span className="icon-tile" style={{ color }}>{icon}</span><p className="mb-1 mt-5 text-[10px] font-bold uppercase tracking-[0.07em] text-white/30">{label}</p><p className="number-font m-0 text-[28px] font-black" style={{ color }}>{value}<span className="ml-1 text-[9px] font-bold tracking-normal text-white/28">{note}</span></p></div>;
}
